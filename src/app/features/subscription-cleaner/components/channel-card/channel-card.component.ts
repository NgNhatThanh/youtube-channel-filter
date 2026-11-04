import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChannelSubscription } from '../../models/channel.model';
import { SubscriptionService } from '../../../../core/services/subscription.service';

@Component({
  selector: 'app-channel-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-[#181818] border rounded-xl p-4 transition flex flex-col justify-between relative group hover:border-neutral-700 shadow-sm"
      [ngClass]="{
        'border-red-600/70 bg-red-950/10 ring-1 ring-red-600/50': channel().isSelected && !channel().isFavorite,
        'border-yellow-500/50 bg-yellow-950/10': channel().isFavorite,
        'border-neutral-800': !channel().isSelected && !channel().isFavorite
      }">

      <!-- Top Row: Checkbox, Channel Avatar, Title, Favorite & Link -->
      <div class="flex items-start gap-3">
        <!-- Checkbox with Protection Guard -->
        <div class="pt-0.5">
          @if (channel().isFavorite) {
            <!-- Protected Channel Icon -->
            <div
              class="w-4 h-4 rounded border border-yellow-500/50 bg-yellow-500/20 text-yellow-400 flex items-center justify-center cursor-not-allowed"
              title="Protected from unsubscribe">
              <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
            </div>
          } @else {
            <input
              type="checkbox"
              [checked]="channel().isSelected"
              (change)="subService.toggleSelect(channel().channelId)"
              class="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-red-600 focus:ring-red-600 cursor-pointer accent-red-600" />
          }
        </div>

        <!-- Thumbnail -->
        <a
          [href]="channel().channelUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 relative">
          <img
            [src]="channel().thumbnailUrl || 'public/favicon.ico'"
            [alt]="channel().title"
            loading="lazy"
            class="w-12 h-12 rounded-full object-cover border border-neutral-700 bg-neutral-900 group-hover:scale-105 transition duration-200"
            (error)="onImageError($event)" />
        </a>

        <!-- Title, Handle, YouTube Link -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1">
            <a
              [href]="channel().channelUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-sm text-neutral-100 hover:text-red-400 truncate flex items-center gap-1 group/title"
              [title]="channel().title">
              <span class="truncate">{{ channel().title }}</span>
              <svg class="w-3 h-3 text-neutral-500 group-hover/title:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>

            <!-- Keep/Favorite Star Toggle -->
            <button
              type="button"
              (click)="subService.toggleFavorite(channel().channelId)"
              class="p-1 rounded hover:bg-neutral-800 transition"
              [title]="channel().isFavorite ? 'Remove Protection' : 'Protect/Keep Channel (Cannot be unsubscribed)'">
              <svg
                class="w-4 h-4 transition"
                [ngClass]="channel().isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600 hover:text-yellow-400'"
                viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </button>
          </div>

          <!-- Channel Handle & Activity stats -->
          <div class="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
            @if (channel().customUrl) {
              <span class="text-neutral-400">{{ channel().customUrl }}</span>
              <span>•</span>
            }
            @if (channel().videoCount !== undefined) {
              <span>{{ channel().videoCount | number }} videos</span>
              <span>•</span>
            }
            @if (channel().subscriberCount !== undefined) {
              <span>{{ formatSubscribers(channel().subscriberCount) }} subs</span>
            }
          </div>
        </div>
      </div>

      <!-- Description or AI Summary -->
      <div class="mt-3 text-xs text-neutral-300 leading-relaxed min-h-[38px] line-clamp-2">
        @if (channel().aiSummary) {
          <p><span class="text-purple-400 font-medium">AI Summary:</span> {{ channel().aiSummary }}</p>
        } @else if (channel().description) {
          <p class="text-neutral-400">{{ channel().description }}</p>
        } @else {
          <p class="text-neutral-600 italic">No channel description available.</p>
        }
      </div>

      <!-- AI Categories & Confidence Badge -->
      <div class="mt-3 pt-2.5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-1.5">
        <div class="flex flex-wrap gap-1">
          @if (channel().isClassified && channel().categories.length > 0) {
            @for (cat of channel().categories; track cat) {
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-neutral-800 border border-neutral-700 text-neutral-300">
                {{ cat }}
              </span>
            }
          } @else {
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 italic">
              Unclassified
            </span>
          }
        </div>

        @if (channel().confidence !== undefined) {
          <span
            class="text-[10px] px-1.5 py-0.2 rounded border font-mono"
            [ngClass]="channel().confidence! >= 0.8 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'"
            title="Classification Confidence Score">
            {{ (channel().confidence! * 100 | number:'1.0-0') }}% conf.
          </span>
        }
      </div>

      <!-- Individual Unsubscribe Action with Inline Confirmation -->
      <div class="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs">
        <span class="text-[11px] text-neutral-500">
          Subscribed {{ channel().subscribedAt | date:'mediumDate' }}
        </span>

        @if (!channel().isFavorite) {
          @if (isConfirmingUnsubscribe) {
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-red-400 font-medium">Confirm?</span>
              <button
                type="button"
                (click)="onUnsubscribeConfirmed()"
                [disabled]="isDeleting"
                class="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition disabled:opacity-50">
                Yes
              </button>
              <button
                type="button"
                (click)="isConfirmingUnsubscribe = false"
                class="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white text-[11px] transition">
                No
              </button>
            </div>
          } @else {
            <button
              type="button"
              (click)="isConfirmingUnsubscribe = true"
              class="text-[11px] text-neutral-500 hover:text-red-400 transition"
              title="Unsubscribe this channel individually">
              Unsubscribe
            </button>
          }
        } @else {
          <span class="text-[11px] text-yellow-500 font-medium flex items-center gap-1">
            Protected
          </span>
        }
      </div>
    </div>
  `
})
export class ChannelCardComponent {
  readonly channel = input.required<ChannelSubscription>();
  readonly subService = inject(SubscriptionService);
  readonly unsubscribeSingle = output<ChannelSubscription>();

  isConfirmingUnsubscribe = false;
  isDeleting = false;

  onUnsubscribeConfirmed(): void {
    this.isConfirmingUnsubscribe = false;
    this.unsubscribeSingle.emit(this.channel());
  }

  onImageError(event: any): void {
    event.target.src = 'public/favicon.ico';
  }

  formatSubscribers(count?: number): string {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }
}
