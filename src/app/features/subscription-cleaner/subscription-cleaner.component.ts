import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { StatsOverviewComponent } from './components/stats-overview/stats-overview.component';
import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { ChannelListComponent } from './components/channel-list/channel-list.component';
import { BulkUnsubscribeModalComponent } from './components/bulk-unsubscribe-modal/bulk-unsubscribe-modal.component';
import { AiSettingsModalComponent } from './components/ai-settings-modal/ai-settings-modal.component';
import { ClientIdModalComponent } from './components/client-id-modal/client-id-modal.component';
import { ExportModalComponent } from './components/export-modal/export-modal.component';
import { AuthService } from '../../core/auth/auth.service';
import { YoutubeService, SyncProgress } from '../../core/services/youtube.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AiClassificationService } from '../../core/services/ai-classification.service';
import { ChannelSubscription } from './models/channel.model';

@Component({
  selector: 'app-subscription-cleaner',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    StatsOverviewComponent,
    FilterBarComponent,
    ChannelListComponent,
    BulkUnsubscribeModalComponent,
    AiSettingsModalComponent,
    ClientIdModalComponent,
    ExportModalComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-[#0F0F0F] text-neutral-100 pb-16">
      <!-- App Header -->
      <app-header
        (openClientIdModal)="showClientIdModal.set(true)"
        (openAiSettings)="showAiSettingsModal.set(true)"
        (openSettings)="showClientIdModal.set(true)" />

      <!-- Main Container -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 flex flex-col gap-5">
        <!-- Error Alert Banner -->
        @if (authService.errorMessage() || generalError()) {
          <div class="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-start justify-between gap-3 shadow-md animate-fade-in">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong class="text-sm font-semibold text-red-200 block">Notice:</strong>
                <p class="text-xs text-red-300 mt-0.5 leading-relaxed">
                  {{ authService.errorMessage() || generalError() }}
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="clearError()"
              class="text-red-400 hover:text-red-200 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        }

        <!-- Sync / Fetching Progress Banner -->
        @if (syncProgress()) {
          <div class="bg-neutral-800/90 border border-neutral-700/80 rounded-xl p-4 shadow-sm animate-fade-in">
            <div class="flex items-center justify-between text-xs text-neutral-300 mb-2">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                <span class="font-medium">{{ syncProgress()?.message }}</span>
              </div>
              <span class="font-mono text-neutral-400">
                @if (syncProgress()?.total) {
                  {{ syncProgress()?.current }} / {{ syncProgress()?.total }}
                }
              </span>
            </div>
            <div class="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
              <div
                class="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                [style.width.%]="syncProgress()?.total ? ((syncProgress()!.current / syncProgress()!.total) * 100) : 50"></div>
            </div>
          </div>
        }

        <!-- AI Classification Progress Banner -->
        @if (aiService.progress().status === 'running') {
          <div class="bg-purple-950/30 border border-purple-500/40 rounded-xl p-4 shadow-sm animate-fade-in">
            <div class="flex items-center justify-between text-xs text-purple-200 mb-2">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                <span class="font-medium">
                  Classifying channels (Batch {{ aiService.progress().currentBatch }} of {{ aiService.progress().totalBatches }})...
                </span>
              </div>
              <div class="flex items-center gap-3">
                <span class="font-mono text-purple-300">
                  {{ aiService.progress().completed }} / {{ aiService.progress().total }}
                </span>
                <button
                  type="button"
                  (click)="aiService.cancelClassification()"
                  class="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700">
                  Cancel
                </button>
              </div>
            </div>
            <div class="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
              <div
                class="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                [style.width.%]="(aiService.progress().completed / aiService.progress().total) * 100"></div>
            </div>
          </div>
        }

        <!-- Demo Mode Quick Access Banner (when not connected and no channels) -->
        @if (!authService.isAuthenticated() && subService.totalCount() === 0) {
          <div class="bg-gradient-to-r from-neutral-900 via-[#181818] to-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div class="flex-1 text-center md:text-left">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">
                One-Time Clean Up Utility
              </div>
              <h2 class="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                Declutter Your YouTube Subscriptions in Minutes
              </h2>
              <p class="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl">
                Fetch your YouTube channels, let AI automatically categorize your subscriptions by topic (Programming, Tech, Gaming, Music, Finance, etc.), protect your favorites, and safely unsubscribe from unwanted channels in bulk.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                (click)="authService.connect()"
                class="px-5 py-3 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>Connect YouTube Account</span>
              </button>
              <button
                type="button"
                (click)="loadDemoData()"
                class="px-4 py-2.5 rounded-xl font-medium text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition border border-neutral-700 flex items-center justify-center gap-2">
                <span>Explore with Sample Data</span>
              </button>
            </div>
          </div>
        }

        <!-- Overview KPI Stats -->
        @if (subService.totalCount() > 0) {
          <app-stats-overview />

          <!-- Filters, Search & Bulk Actions Bar -->
          <app-filter-bar
            (triggerAiClassification)="startAiClassification()"
            (openBulkUnsubscribeModal)="showBulkUnsubscribeModal.set(true)"
            (openExportModal)="showExportModal.set(true)" />
        }

        <!-- Channel List Grid/Table View -->
        <app-channel-list
          (triggerSync)="fetchSubscriptions()"
          (unsubscribeSingle)="unsubscribeSingleChannel($event)" />
      </main>

      <!-- Modals -->
      @if (showBulkUnsubscribeModal()) {
        <app-bulk-unsubscribe-modal
          (closeModal)="showBulkUnsubscribeModal.set(false)" />
      }

      @if (showAiSettingsModal()) {
        <app-ai-settings-modal
          (closeModal)="showAiSettingsModal.set(false)" />
      }

      @if (showClientIdModal()) {
        <app-client-id-modal
          (closeModal)="showClientIdModal.set(false)" />
      }

      @if (showExportModal()) {
        <app-export-modal
          (closeModal)="showExportModal.set(false)" />
      }
    </div>
  `
})
export class SubscriptionCleanerComponent {
  readonly authService = inject(AuthService);
  readonly youtubeService = inject(YoutubeService);
  readonly subService = inject(SubscriptionService);
  readonly aiService = inject(AiClassificationService);

  readonly showBulkUnsubscribeModal = signal(false);
  readonly showAiSettingsModal = signal(false);
  readonly showClientIdModal = signal(false);
  readonly showExportModal = signal(false);

  readonly syncProgress = signal<SyncProgress | null>(null);
  readonly generalError = signal<string | null>(null);

  clearError(): void {
    this.generalError.set(null);
  }

  async fetchSubscriptions(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      this.authService.connect();
      return;
    }

    this.generalError.set(null);
    try {
      const channels = await this.youtubeService.fetchAllSubscriptions((prog) => {
        this.syncProgress.set(prog);
      });
      this.subService.setChannels(channels);
      setTimeout(() => this.syncProgress.set(null), 1500);
    } catch (err: any) {
      this.generalError.set(err.message || 'Failed to fetch YouTube subscriptions.');
      this.syncProgress.set(null);
    }
  }

  async startAiClassification(): Promise<void> {
    if (!this.aiService.hasApiKey()) {
      this.showAiSettingsModal.set(true);
      return;
    }

    this.generalError.set(null);
    try {
      await this.aiService.classifyChannels(
        this.subService.channels(),
        false,
        (updatedChannel) => {
          this.subService.updateChannel(updatedChannel.channelId, updatedChannel);
        }
      );
    } catch (err: any) {
      this.generalError.set(err.message || 'AI Classification encountered an error.');
    }
  }

  async unsubscribeSingleChannel(channel: ChannelSubscription): Promise<void> {
    if (channel.isFavorite) {
      alert('This channel is protected as a favorite and cannot be unsubscribed.');
      return;
    }

    try {
      // If running with mock data, simulate success
      if (channel.subscriptionId.startsWith('mock-')) {
        this.subService.channels.update(list => list.filter(c => c.channelId !== channel.channelId));
        return;
      }

      await this.youtubeService.deleteSubscription(channel.subscriptionId);
      this.subService.channels.update(list => list.filter(c => c.channelId !== channel.channelId));
    } catch (err: any) {
      this.generalError.set(`Failed to unsubscribe ${channel.title}: ${err.message || 'Error'}`);
    }
  }

  loadDemoData(): void {
    const demoChannels: ChannelSubscription[] = [
      {
        subscriptionId: 'mock-sub-1',
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        title: 'Google Developers',
        description: 'The Google Developers channel and its live streams give you access to Google developer events, technical lectures and product news.',
        customUrl: '@googledevelopers',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kX44Y30r-sQe_z1pW2R8eH4g4v9r0=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@googledevelopers',
        subscribedAt: '2023-01-15T10:00:00Z',
        videoCount: 5400,
        subscriberCount: 2350000,
        isClassified: true,
        categories: ['Software Engineering', 'Cloud Computing', 'Artificial Intelligence'],
        aiSummary: 'Official Google channel for developers covering Android, Cloud, AI, and web technologies.',
        confidence: 0.98,
        isSelected: false,
        isFavorite: true
      },
      {
        subscriptionId: 'mock-sub-2',
        channelId: 'UCsBjURrPoezykLs9EqgamOA',
        title: 'Fireship',
        description: 'High-intensity code tutorials and tech news to help you ship apps faster.',
        customUrl: '@fireship',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_n0N6P5mYn9l7a1b3c=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@fireship',
        subscribedAt: '2022-05-10T12:00:00Z',
        videoCount: 620,
        subscriberCount: 3100000,
        isClassified: true,
        categories: ['Programming', 'Technology'],
        aiSummary: 'Fast-paced, entertaining software engineering tutorials and tech culture updates.',
        confidence: 0.99,
        isSelected: false,
        isFavorite: false
      },
      {
        subscriptionId: 'mock-sub-3',
        channelId: 'UCW5YeuERMmlnqo4oq8vwUpg',
        title: 'The Net Ninja',
        description: 'Black-belt web development tutorials on JavaScript, React, Angular, Vue, Node.js and more.',
        customUrl: '@netninja',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kM6n5xY2=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@netninja',
        subscribedAt: '2021-08-20T14:30:00Z',
        videoCount: 2150,
        subscriberCount: 1250000,
        isClassified: true,
        categories: ['Programming', 'Education'],
        aiSummary: 'Comprehensive multi-part web development video courses and practical guides.',
        confidence: 0.96,
        isSelected: false,
        isFavorite: false
      },
      {
        subscriptionId: 'mock-sub-4',
        channelId: 'UCBJycsmduvYEL83R_U4JriQ',
        title: 'Marques Brownlee',
        description: 'Quality tech videos | YouTuber | Geek | Consumer Electronics reviews.',
        customUrl: '@mkbhd',
        thumbnailUrl: 'https://yt3.googleusercontent.com/lkH37D712tiyphnu0Id0Q5MwwQ7NuMW=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@mkbhd',
        subscribedAt: '2020-03-12T09:15:00Z',
        videoCount: 1650,
        subscriberCount: 18900000,
        isClassified: true,
        categories: ['Technology'],
        aiSummary: 'Premier in-depth reviews of consumer electronics, smartphones, and electric vehicles.',
        confidence: 0.97,
        isSelected: false,
        isFavorite: true
      },
      {
        subscriptionId: 'mock-sub-5',
        channelId: 'UC7cs8q-gJRlG07XdSEKY9A',
        title: 'Retro Gaming Vault (Inactive)',
        description: 'Old gaming clips from 2014. No longer updating.',
        customUrl: '@retrogamingvault',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_m9=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@retrogamingvault',
        subscribedAt: '2015-06-01T08:00:00Z',
        videoCount: 12,
        subscriberCount: 420,
        isClassified: true,
        categories: ['Gaming', 'Entertainment'],
        aiSummary: 'Discontinued archive of classic arcade gameplay recordings.',
        confidence: 0.88,
        isSelected: true,
        isFavorite: false
      },
      {
        subscriptionId: 'mock-sub-6',
        channelId: 'UC29ju8bIPH5as8OGnQzwJyA',
        title: 'Traversy Media',
        description: 'Web development and programming tutorials for all skill levels.',
        customUrl: '@traversymedia',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_kM9P=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@traversymedia',
        subscribedAt: '2019-11-25T11:00:00Z',
        videoCount: 980,
        subscriberCount: 2200000,
        isClassified: false,
        categories: [],
        isSelected: false,
        isFavorite: false
      },
      {
        subscriptionId: 'mock-sub-7',
        channelId: 'UC_random_clickbait_99',
        title: 'Daily Meme Compilation 2018',
        description: 'Random viral memes from years ago.',
        customUrl: '@oldmemes2018',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_m123=s176-c-k-c0x00ffffff-no-rj',
        channelUrl: 'https://www.youtube.com/@oldmemes2018',
        subscribedAt: '2018-04-18T16:20:00Z',
        videoCount: 45,
        subscriberCount: 1200,
        isClassified: false,
        categories: [],
        isSelected: true,
        isFavorite: false
      }
    ];

    this.subService.setChannels(demoChannels);
  }
}
