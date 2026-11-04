import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelSubscription } from '../../models/channel.model';
import { YoutubeService } from '../../../../core/services/youtube.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';

@Component({
  selector: 'app-bulk-unsubscribe-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-[#181818] border border-neutral-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Bulk Unsubscribe Confirmation</h3>
              <p class="text-xs text-neutral-400">Review selected channels before permanent unsubscription</p>
            </div>
          </div>

          @if (!isRunning()) {
            <button
              type="button"
              (click)="closeModal.emit()"
              class="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          }
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-sm">
          <!-- STAGE 1: CONFIRMATION STAGE -->
          @if (!isRunning() && !isFinished()) {
            <!-- Safety Notice Banner -->
            <div class="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
              <svg class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <strong class="font-semibold block mb-0.5">Permanent YouTube Action</strong>
                This will call the YouTube Data API to remove these subscriptions from your Google Account.
                Protected (favorite) channels are strictly excluded.
              </div>
            </div>

            <!-- Channel Summary & List -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-neutral-300">
                  Target Channels to Unsubscribe (<strong class="text-red-400">{{ targetChannels().length }}</strong>)
                </span>
                <span class="text-[11px] text-neutral-500">
                  {{ favoritesProtectedCount() }} protected channels excluded
                </span>
              </div>

              <div class="border border-neutral-800 rounded-xl max-h-60 overflow-y-auto divide-y divide-neutral-800 bg-neutral-900/60 p-1">
                @for (ch of targetChannels(); track ch.channelId) {
                  <div class="p-2 flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <img
                        [src]="ch.thumbnailUrl || 'public/favicon.ico'"
                        [alt]="ch.title"
                        class="w-6 h-6 rounded-full object-cover border border-neutral-700 shrink-0" />
                      <span class="text-neutral-200 font-medium truncate">{{ ch.title }}</span>
                    </div>
                    <span class="text-[11px] text-neutral-500 shrink-0">
                      {{ ch.categories.slice(0, 2).join(', ') || 'Unclassified' }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- Explicit Confirmation Word Requirement for High Safety -->
            <div class="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3.5">
              <label class="block text-xs font-medium text-neutral-300 mb-1.5">
                Type <span class="font-mono text-red-400 font-bold tracking-wider">UNSUBSCRIBE</span> below to verify explicit confirmation:
              </label>
              <input
                type="text"
                [(ngModel)]="confirmationInput"
                placeholder="UNSUBSCRIBE"
                class="w-full bg-[#141414] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 uppercase tracking-widest font-mono" />
            </div>
          }

          <!-- STAGE 2: RUNNING PROGRESS STAGE -->
          @if (isRunning()) {
            <div class="flex flex-col items-center justify-center py-6 text-center">
              <div class="w-12 h-12 rounded-full border-2 border-red-500 border-t-transparent animate-spin mb-4"></div>
              <h4 class="text-base font-bold text-white mb-1">Unsubscribing Channels...</h4>
              <p class="text-xs text-neutral-400 mb-4">
                Processing {{ currentIndex() }} of {{ targetChannels().length }} channels with controlled concurrency
              </p>

              <!-- Progress bar -->
              <div class="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden mb-6">
                <div
                  class="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                  [style.width.%]="(currentIndex() / targetChannels().length) * 100"></div>
              </div>

              <!-- Live Execution Status List -->
              <div class="w-full border border-neutral-800 rounded-xl max-h-52 overflow-y-auto divide-y divide-neutral-800 bg-neutral-900/60 p-1 text-left">
                @for (ch of targetChannels(); track ch.channelId) {
                  <div class="p-2 flex items-center justify-between gap-2 text-xs">
                    <span class="text-neutral-300 truncate">{{ ch.title }}</span>
                    @if (ch.unsubscribeStatus === 'pending') {
                      <span class="text-amber-400 text-[10px] animate-pulse">Deleting...</span>
                    } @else if (ch.unsubscribeStatus === 'success') {
                      <span class="text-emerald-400 text-[10px] font-bold">✓ Unsubscribed</span>
                    } @else if (ch.unsubscribeStatus === 'failed') {
                      <span class="text-red-400 text-[10px] font-bold" [title]="ch.unsubscribeError || 'Error'">✗ Failed</span>
                    } @else {
                      <span class="text-neutral-600 text-[10px]">Queued</span>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- STAGE 3: FINISHED SUMMARY STAGE -->
          @if (isFinished()) {
            <div class="py-4 text-center">
              <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h4 class="text-lg font-bold text-white mb-1">Unsubscribe Batch Completed</h4>
              <p class="text-xs text-neutral-400 mb-6">Here is the final execution summary:</p>

              <div class="grid grid-cols-2 gap-3 mb-6 max-w-sm mx-auto">
                <div class="bg-neutral-900/80 border border-emerald-500/30 rounded-xl p-3 text-center">
                  <span class="text-xs text-neutral-400 block mb-0.5">Successful</span>
                  <span class="text-2xl font-bold text-emerald-400">{{ finalSuccessCount() }}</span>
                </div>
                <div class="bg-neutral-900/80 border border-red-500/30 rounded-xl p-3 text-center">
                  <span class="text-xs text-neutral-400 block mb-0.5">Failed</span>
                  <span class="text-2xl font-bold text-red-400">{{ finalFailureCount() }}</span>
                </div>
              </div>

              @if (finalFailureCount() > 0) {
                <div class="text-left border border-neutral-800 rounded-xl max-h-40 overflow-y-auto p-2 bg-neutral-900/60 mb-4">
                  <span class="text-[11px] text-red-400 font-semibold block mb-1">Failed Items:</span>
                  @for (ch of failedChannels(); track ch.channelId) {
                    <div class="text-xs text-neutral-300 py-1 border-b border-neutral-800/60 flex items-center justify-between">
                      <span class="truncate">{{ ch.title }}</span>
                      <span class="text-[10px] text-red-400">{{ ch.unsubscribeError || 'Error' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/50">
          @if (!isRunning() && !isFinished()) {
            <button
              type="button"
              (click)="closeModal.emit()"
              class="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition">
              Cancel
            </button>
            <button
              type="button"
              (click)="startUnsubscribe()"
              [disabled]="confirmationInput.trim().toUpperCase() !== 'UNSUBSCRIBE' || targetChannels().length === 0"
              class="px-5 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition shadow-lg shadow-red-600/30 disabled:opacity-40 disabled:cursor-not-allowed">
              Confirm & Unsubscribe ({{ targetChannels().length }})
            </button>
          } @else if (isFinished()) {
            @if (finalFailureCount() > 0) {
              <button
                type="button"
                (click)="retryFailed()"
                class="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition">
                Retry {{ finalFailureCount() }} Failed
              </button>
            }
            <button
              type="button"
              (click)="finishAndClean()"
              class="px-5 py-2 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition border border-neutral-700">
              Done & Remove from List
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class BulkUnsubscribeModalComponent {
  private readonly youtubeService = inject(YoutubeService);
  private readonly subService = inject(SubscriptionService);

  readonly closeModal = output<void>();

  confirmationInput = '';
  readonly isRunning = signal(false);
  readonly isFinished = signal(false);
  readonly currentIndex = signal(0);
  readonly finalSuccessCount = signal(0);
  readonly finalFailureCount = signal(0);

  // Strictly target channels excluding any favorite/protected channel
  targetChannels(): ChannelSubscription[] {
    return this.subService.channels().filter(c => c.isSelected && !c.isFavorite);
  }

  favoritesProtectedCount(): number {
    return this.subService.channels().filter(c => c.isFavorite && c.isSelected).length;
  }

  failedChannels(): ChannelSubscription[] {
    return this.targetChannels().filter(c => c.unsubscribeStatus === 'failed');
  }

  async startUnsubscribe(): Promise<void> {
    const targets = this.targetChannels();
    if (targets.length === 0) return;

    this.isRunning.set(true);
    this.isFinished.set(false);
    this.currentIndex.set(0);

    const result = await this.youtubeService.deleteSubscriptionsBulk(
      targets,
      3,
      (idx, ch, success, err) => {
        this.currentIndex.set(idx);
        this.subService.updateChannel(ch.channelId, {
          unsubscribeStatus: success ? 'success' : 'failed',
          unsubscribeError: err
        });
      }
    );

    this.finalSuccessCount.set(result.successCount);
    this.finalFailureCount.set(result.failureCount);
    this.isRunning.set(false);
    this.isFinished.set(true);
  }

  async retryFailed(): Promise<void> {
    const failed = this.failedChannels();
    if (failed.length === 0) return;

    this.isRunning.set(true);
    this.isFinished.set(false);
    this.currentIndex.set(0);

    const result = await this.youtubeService.deleteSubscriptionsBulk(
      failed,
      2,
      (idx, ch, success, err) => {
        this.currentIndex.set(idx);
        this.subService.updateChannel(ch.channelId, {
          unsubscribeStatus: success ? 'success' : 'failed',
          unsubscribeError: err
        });
      }
    );

    this.finalSuccessCount.update(c => c + result.successCount);
    this.finalFailureCount.set(result.failureCount);
    this.isRunning.set(false);
    this.isFinished.set(true);
  }

  finishAndClean(): void {
    // Remove successfully unsubscribed channels from state
    this.subService.removeUnsubscribedChannels();
    this.subService.clearSelection();
    this.closeModal.emit();
  }
}
