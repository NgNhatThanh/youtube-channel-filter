import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { ChannelCardComponent } from '../channel-card/channel-card.component';
import { ChannelSubscription } from '../../models/channel.model';

@Component({
  selector: 'app-channel-list',
  standalone: true,
  imports: [CommonModule, ChannelCardComponent],
  template: `
    <div class="mt-4">
      <!-- Empty State: No channels loaded yet -->
      @if (subService.totalCount() === 0) {
        <div class="bg-[#161616] border border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm">
          <div class="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-neutral-400 mb-4">
            <svg class="w-8 h-8 text-red-500 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <h2 class="text-lg font-bold text-neutral-100 mb-2">No Subscriptions Loaded</h2>
          <p class="text-sm text-neutral-400 mb-6 max-w-md">
            Connect your YouTube account above and fetch your subscriptions to start organizing and cleaning up unwanted channels with AI.
          </p>
          <button
            type="button"
            (click)="triggerSync.emit()"
            class="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition shadow-lg shadow-red-600/30 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Fetch Subscriptions Now</span>
          </button>
        </div>
      } @else if (subService.filteredChannels().length === 0) {
        <!-- Filter Empty State -->
        <div class="bg-[#161616] border border-neutral-800 rounded-xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto">
          <svg class="w-10 h-10 text-neutral-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 class="text-base font-semibold text-neutral-200 mb-1">No channels match current filters</h3>
          <p class="text-xs text-neutral-400 mb-4">Try clearing your search query or adjusting the selected topic tags.</p>
          <button
            type="button"
            (click)="resetFilters()"
            class="px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-800 text-xs text-neutral-200 hover:text-white transition">
            Reset All Filters
          </button>
        </div>
      } @else {
        <!-- Render Mode: GRID VIEW -->
        @if (subService.filterState().viewMode === 'grid') {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            @for (ch of subService.filteredChannels(); track ch.channelId) {
              <app-channel-card
                [channel]="ch"
                (unsubscribeSingle)="unsubscribeSingle.emit($event)" />
            }
          </div>
        } @else {
          <!-- Render Mode: TABLE VIEW -->
          <div class="bg-[#181818] border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#202020] border-b border-neutral-800 text-neutral-400 font-medium">
                    <th class="p-3 w-10 text-center">
                      <span class="sr-only">Select</span>
                    </th>
                    <th class="p-3">Channel</th>
                    <th class="p-3">Topics</th>
                    <th class="p-3">AI Summary</th>
                    <th class="p-3 text-right">Stats</th>
                    <th class="p-3 text-center">Protected</th>
                    <th class="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-800/80 text-neutral-200">
                  @for (ch of subService.filteredChannels(); track ch.channelId) {
                    <tr
                      class="hover:bg-neutral-800/40 transition"
                      [ngClass]="{
                        'bg-red-950/20': ch.isSelected && !ch.isFavorite,
                        'bg-yellow-950/10': ch.isFavorite
                      }">
                      <!-- Select Checkbox -->
                      <td class="p-3 text-center">
                        @if (ch.isFavorite) {
                          <span class="text-yellow-500 text-xs" title="Protected">🔒</span>
                        } @else {
                          <input
                            type="checkbox"
                            [checked]="ch.isSelected"
                            (change)="subService.toggleSelect(ch.channelId)"
                            class="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-red-600 focus:ring-red-600 cursor-pointer accent-red-600" />
                        }
                      </td>

                      <!-- Channel Info -->
                      <td class="p-3">
                        <div class="flex items-center gap-2.5">
                          <img
                            [src]="ch.thumbnailUrl || 'public/favicon.ico'"
                            [alt]="ch.title"
                            loading="lazy"
                            class="w-8 h-8 rounded-full object-cover border border-neutral-700 bg-neutral-900 shrink-0" />
                          <div class="flex flex-col min-w-0">
                            <a
                              [href]="ch.channelUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="font-semibold text-neutral-100 hover:text-red-400 truncate max-w-[200px]"
                              [title]="ch.title">
                              {{ ch.title }}
                            </a>
                            <span class="text-[10px] text-neutral-500">{{ ch.customUrl || ch.channelId }}</span>
                          </div>
                        </div>
                      </td>

                      <!-- Topics / Categories -->
                      <td class="p-3">
                        <div class="flex flex-wrap gap-1 max-w-[220px]">
                          @if (ch.isClassified && ch.categories.length > 0) {
                            @for (cat of ch.categories; track cat) {
                              <span class="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
                                {{ cat }}
                              </span>
                            }
                          } @else {
                            <span class="text-[9px] text-neutral-500 italic">Unclassified</span>
                          }
                        </div>
                      </td>

                      <!-- AI Summary -->
                      <td class="p-3 max-w-xs text-neutral-400 line-clamp-2">
                        {{ ch.aiSummary || ch.description || '—' }}
                      </td>

                      <!-- Stats -->
                      <td class="p-3 text-right whitespace-nowrap text-neutral-400">
                        <div>{{ ch.videoCount !== undefined ? (ch.videoCount | number) : '—' }} vids</div>
                        <div class="text-[10px] text-neutral-500">
                          {{ ch.subscriberCount !== undefined ? formatSubs(ch.subscriberCount) : '—' }} subs
                        </div>
                      </td>

                      <!-- Protected Favorite Toggle -->
                      <td class="p-3 text-center">
                        <button
                          type="button"
                          (click)="subService.toggleFavorite(ch.channelId)"
                          class="p-1 rounded hover:bg-neutral-800 transition"
                          [title]="ch.isFavorite ? 'Remove Protection' : 'Protect Channel'">
                          <svg
                            class="w-4 h-4 mx-auto"
                            [ngClass]="ch.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600 hover:text-yellow-400'"
                            viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        </button>
                      </td>

                      <!-- Action Button -->
                      <td class="p-3 text-right">
                        @if (!ch.isFavorite) {
                          <button
                            type="button"
                            (click)="unsubscribeSingle.emit(ch)"
                            class="text-[11px] text-neutral-400 hover:text-red-400 underline underline-offset-2 transition">
                            Unsubscribe
                          </button>
                        } @else {
                          <span class="text-[10px] text-yellow-500 font-medium">Safe</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class ChannelListComponent {
  readonly subService = inject(SubscriptionService);

  readonly triggerSync = output<void>();
  readonly unsubscribeSingle = output<ChannelSubscription>();

  resetFilters(): void {
    this.subService.clearCategoryFilters();
    this.subService.updateFilter({ searchQuery: '', filterStatus: 'all' });
  }

  formatSubs(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }
}
