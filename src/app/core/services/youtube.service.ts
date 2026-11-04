import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ChannelSubscription, RecentVideo } from '../../features/subscription-cleaner/models/channel.model';

export interface SyncProgress {
  stage: 'idle' | 'subscriptions' | 'channel_details' | 'recent_videos' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly API_BASE = 'https://www.googleapis.com/youtube/v3';

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getValidToken();
    if (!token) {
      throw new Error('Not authenticated with Google. Please connect your YouTube account.');
    }
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /**
   * Fetches all subscriptions for the authenticated user with pagination and progress reporting.
   */
  async fetchAllSubscriptions(onProgress?: (progress: SyncProgress) => void): Promise<ChannelSubscription[]> {
    const subscriptions: ChannelSubscription[] = [];
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;

    onProgress?.({
      stage: 'subscriptions',
      current: 0,
      total: 0,
      message: 'Retrieving subscription list...'
    });

    try {
      do {
        pageCount++;
        const url: string = `${this.API_BASE}/subscriptions?part=snippet,contentDetails&mine=true&maxResults=50${
          nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''
        }&order=alphabetical`;

        const response: any = await firstValueFrom(
          this.http.get<any>(url, { headers: this.getAuthHeaders() })
        );

        const totalItems = response.pageInfo?.totalResults || subscriptions.length + (response.items?.length || 0);

        if (response.items && Array.isArray(response.items)) {
          for (const item of response.items) {
            const channelId = item.snippet?.resourceId?.channelId;
            if (!channelId) continue;

            const subscriptionId = item.id;
            const title = item.snippet?.title || 'Unknown Channel';
            const description = item.snippet?.description || '';
            const thumbs = item.snippet?.thumbnails;
            const thumbnailUrl = thumbs?.high?.url || thumbs?.medium?.url || thumbs?.default?.url || '';
            const subscribedAt = item.snippet?.publishedAt || '';
            const channelUrl = `https://www.youtube.com/channel/${channelId}`;

            subscriptions.push({
              subscriptionId,
              channelId,
              title,
              description,
              thumbnailUrl,
              channelUrl,
              subscribedAt,
              isClassified: false,
              categories: [],
              isSelected: false,
              isFavorite: false,
              unsubscribeStatus: 'idle'
            });
          }
        }

        onProgress?.({
          stage: 'subscriptions',
          current: subscriptions.length,
          total: totalItems,
          message: `Fetched ${subscriptions.length} of ${totalItems} subscriptions...`
        });

        nextPageToken = response.nextPageToken;
      } while (nextPageToken);

      // Now enrich with channel details (statistics, custom URL, video counts) in batches of 50
      if (subscriptions.length > 0) {
        onProgress?.({
          stage: 'channel_details',
          current: 0,
          total: subscriptions.length,
          message: 'Enriching channel metadata & statistics...'
        });

        await this.enrichChannelDetails(subscriptions, onProgress);
      }

      onProgress?.({
        stage: 'complete',
        current: subscriptions.length,
        total: subscriptions.length,
        message: `Successfully loaded ${subscriptions.length} subscriptions.`
      });

      return subscriptions;
    } catch (err: any) {
      const parsedError = this.parseApiError(err);
      onProgress?.({
        stage: 'error',
        current: subscriptions.length,
        total: subscriptions.length,
        message: parsedError
      });
      throw new Error(parsedError);
    }
  }

  /**
   * Calls channels.list in batches of 50 to get statistics, custom URLs, and upload playlist IDs.
   */
  private async enrichChannelDetails(
    channels: ChannelSubscription[],
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    const channelMap = new Map<string, ChannelSubscription>();
    for (const ch of channels) {
      channelMap.set(ch.channelId, ch);
    }

    const channelIds = Array.from(channelMap.keys());
    const batchSize = 50;

    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batchIds = channelIds.slice(i, i + batchSize);
      try {
        const url = `${this.API_BASE}/channels?part=snippet,statistics,contentDetails&id=${batchIds.join(',')}&maxResults=50`;
        const resp: any = await firstValueFrom(
          this.http.get<any>(url, { headers: this.getAuthHeaders() })
        );

        if (resp.items && Array.isArray(resp.items)) {
          for (const item of resp.items) {
            const ch = channelMap.get(item.id);
            if (ch) {
              if (item.statistics) {
                ch.videoCount = Number(item.statistics.videoCount) || 0;
                ch.subscriberCount = Number(item.statistics.subscriberCount) || 0;
                ch.viewCount = Number(item.statistics.viewCount) || 0;
              }
              if (item.snippet?.customUrl) {
                ch.customUrl = item.snippet.customUrl;
                ch.channelUrl = `https://www.youtube.com/${item.snippet.customUrl}`;
              }
              // If subscription description was empty or truncated, prefer full channel description
              if ((!ch.description || ch.description.length < 20) && item.snippet?.description) {
                ch.description = item.snippet.description;
              }
              // Higher quality avatar if available
              if (item.snippet?.thumbnails?.high?.url) {
                ch.thumbnailUrl = item.snippet.thumbnails.high.url;
              }
            }
          }
        }
      } catch (e) {
        // Non-fatal error during batch enrichment - continue with remaining
        console.warn('Failed to enrich batch of channel details', e);
      }

      onProgress?.({
        stage: 'channel_details',
        current: Math.min(i + batchSize, channelIds.length),
        total: channelIds.length,
        message: `Enriched ${Math.min(i + batchSize, channelIds.length)} of ${channelIds.length} channels...`
      });
    }
  }

  /**
   * Fetches recent videos for specific channels (optional enrichment for deeper AI classification)
   */
  async fetchRecentVideosForChannel(channelId: string): Promise<RecentVideo[]> {
    try {
      // Fetch channel contentDetails to get uploads playlist ID
      const chUrl = `${this.API_BASE}/channels?part=contentDetails&id=${channelId}`;
      const chResp: any = await firstValueFrom(
        this.http.get<any>(chUrl, { headers: this.getAuthHeaders() })
      );

      const uploadsPlaylistId = chResp.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        return [];
      }

      // Fetch up to 5 recent videos from the uploads playlist (cost: only 1 quota unit)
      const plUrl = `${this.API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5`;
      const plResp: any = await firstValueFrom(
        this.http.get<any>(plUrl, { headers: this.getAuthHeaders() })
      );

      if (!plResp.items || !Array.isArray(plResp.items)) {
        return [];
      }

      return plResp.items.map((it: any) => ({
        title: it.snippet?.title || '',
        description: it.snippet?.description || '',
        publishedAt: it.snippet?.publishedAt || ''
      }));
    } catch {
      return [];
    }
  }

  /**
   * Unsubscribes a single channel using subscriptions.delete.
   * Subscription resource ID is required.
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    const url = `${this.API_BASE}/subscriptions?id=${encodeURIComponent(subscriptionId)}`;
    await firstValueFrom(
      this.http.delete(url, { headers: this.getAuthHeaders() })
    );
  }

  /**
   * Bulk unsubscribes with controlled concurrency and progress callback.
   */
  async deleteSubscriptionsBulk(
    channels: ChannelSubscription[],
    concurrency = 3,
    onProgress?: (index: number, channel: ChannelSubscription, success: boolean, error?: string) => void
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;
    let index = 0;

    // Filter out favorite channels for extreme safety
    const safeCandidates = channels.filter(c => !c.isFavorite);

    const pool = new Set<Promise<void>>();

    for (const channel of safeCandidates) {
      channel.unsubscribeStatus = 'pending';
      channel.unsubscribeError = undefined;

      const task = (async () => {
        const currentIndex = ++index;
        try {
          await this.deleteSubscription(channel.subscriptionId);
          channel.unsubscribeStatus = 'success';
          successCount++;
          onProgress?.(currentIndex, channel, true);
        } catch (err: any) {
          channel.unsubscribeStatus = 'failed';
          const errMsg = this.parseApiError(err);
          channel.unsubscribeError = errMsg;
          failureCount++;
          onProgress?.(currentIndex, channel, false, errMsg);
        }
      })();

      pool.add(task);
      task.finally(() => pool.delete(task));

      if (pool.size >= concurrency) {
        await Promise.race(pool);
      }
    }

    await Promise.all(pool);
    return { successCount, failureCount };
  }

  /**
   * Parses Google / YouTube API error into clear user-friendly messages.
   */
  parseApiError(err: any): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'YouTube authorization expired or invalid. Please re-authenticate.';
      }
      if (err.status === 403) {
        const errorReason = err.error?.error?.errors?.[0]?.reason;
        if (errorReason === 'quotaExceeded') {
          return 'YouTube API Daily Quota Exceeded. Google limits free YouTube Data API calls to 10,000 units/day. Please try again tomorrow or use another project.';
        }
        if (errorReason === 'rateLimitExceeded') {
          return 'YouTube API rate limit reached. Please wait a moment and try again.';
        }
        return err.error?.error?.message || 'Access forbidden: Insufficient permissions or quota exceeded.';
      }
      if (err.status === 404) {
        return 'Resource not found on YouTube.';
      }
      return err.error?.error?.message || `YouTube API error (HTTP ${err.status})`;
    }
    return err?.message || 'Unexpected network error connecting to YouTube.';
  }
}
