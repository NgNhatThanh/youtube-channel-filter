import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { AiClassificationService } from '../../../../core/services/ai-classification.service';
import { SUGGESTED_CATEGORIES } from '../../models/channel.model';
import { SortOption, ViewMode } from '../../models/filter.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-[#161616] border border-neutral-800 rounded-xl p-4 shadow-sm flex flex-col gap-4">
      <!-- Top Row: Search, Sort, View Toggle, and Primary Action Buttons -->
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            [ngModel]="subService.filterState().searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search channels by name, summary or handle..."
            class="w-full bg-[#1F1F1F] border border-neutral-700/80 rounded-lg pl-9 pr-8 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition" />
          @if (subService.filterState().searchQuery) {
            <button
              type="button"
              (click)="onSearchChange('')"
              class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-white"
              title="Clear search">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          }
        </div>

        <!-- Controls: Sort, Activity Filter, View Mode -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Sort Dropdown -->
          <div class="flex items-center gap-1.5 bg-[#1F1F1F] border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300">
            <span class="text-neutral-500 font-medium">Sort:</span>
            <select
              [ngModel]="subService.filterState().sortBy"
              (ngModelChange)="onSortChange($event)"
              class="bg-transparent text-neutral-200 focus:outline-none cursor-pointer">
              <option value="title-asc" class="bg-neutral-800">Channel Name (A → Z)</option>
              <option value="title-desc" class="bg-neutral-800">Channel Name (Z → A)</option>
              <option value="subscribed-desc" class="bg-neutral-800">Newest Subscriptions</option>
              <option value="subscribed-asc" class="bg-neutral-800">Oldest Subscriptions</option>
              <option value="videos-desc" class="bg-neutral-800">Most Videos</option>
              <option value="confidence-desc" class="bg-neutral-800">Highest AI Confidence</option>
            </select>
          </div>

          <!-- View Mode Toggle -->
          <div class="flex items-center bg-[#1F1F1F] border border-neutral-700/80 rounded-lg p-0.5">
            <button
              type="button"
              (click)="setViewMode('grid')"
              class="p-1.5 rounded transition"
              [ngClass]="subService.filterState().viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'"
              title="Grid View">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button
              type="button"
              (click)="setViewMode('table')"
              class="p-1.5 rounded transition"
              [ngClass]="subService.filterState().viewMode === 'table' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'"
              title="Table View">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>

          <!-- Export Button -->
          <button
            type="button"
            (click)="openExportModal.emit()"
            class="text-xs px-2.5 py-2 rounded-lg border border-neutral-700/80 bg-[#1F1F1F] hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1.5"
            title="Export to JSON or CSV">
            <svg class="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>Export</span>
          </button>
        </div>
      </div>

      <!-- Category Filter Pills (Suggested & Active) -->
      <div class="flex flex-col gap-1.5 border-t border-neutral-800/80 pt-3">
        <div class="flex items-center justify-between text-xs text-neutral-400">
          <span class="font-medium text-neutral-300 flex items-center gap-1.5">
            Filter Topics
            @if (subService.filterState().selectedCategories.length > 0) {
              <span class="bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                {{ subService.filterState().selectedCategories.length }} active
              </span>
            }
          </span>
          @if (subService.filterState().selectedCategories.length > 0) {
            <button
              type="button"
              (click)="subService.clearCategoryFilters()"
              class="text-[11px] text-neutral-400 hover:text-red-400 transition underline underline-offset-2">
              Clear topic filters
            </button>
          }
        </div>

        <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 py-1 scrollbar-thin">
          @for (cat of categories; track cat) {
            <button
              type="button"
              (click)="subService.toggleCategoryFilter(cat)"
              class="text-xs px-2.5 py-1 rounded-full transition border font-medium flex items-center gap-1"
              [ngClass]="subService.filterState().selectedCategories.includes(cat)
                ? 'bg-red-600 text-white border-red-500 shadow-sm shadow-red-600/30'
                : 'bg-[#222222] text-neutral-400 border-neutral-700/60 hover:text-white hover:border-neutral-600'">
              <span>{{ cat }}</span>
              @if (subService.filterState().selectedCategories.includes(cat)) {
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              }
            </button>
          }
        </div>
      </div>

      <!-- Action Bar: Selection Management & Bulk Unsubscribe Trigger -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800/80 pt-3 text-xs">
        <div class="flex items-center gap-2">
          <!-- Select All Filtered -->
          <button
            type="button"
            (click)="subService.selectAllFiltered()"
            [disabled]="subService.filteredChannels().length === 0"
            class="px-2.5 py-1.5 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition disabled:opacity-40">
            Select All Filtered ({{ subService.filteredChannels().length }})
          </button>

          <!-- Clear Selection -->
          @if (subService.selectedCount() > 0) {
            <button
              type="button"
              (click)="subService.clearSelection()"
              class="px-2.5 py-1.5 rounded-md border border-neutral-800 text-neutral-400 hover:text-white transition">
              Clear Selection
            </button>
          }

          <span class="text-neutral-500 hidden sm:inline">
            Showing <strong class="text-neutral-300">{{ subService.filteredChannels().length }}</strong> of {{ subService.totalCount() }} channels
          </span>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <!-- AI Classify Action -->
          <button
            type="button"
            (click)="triggerAiClassification.emit()"
            [disabled]="aiService.progress().status === 'running' || subService.totalCount() === 0"
            class="px-3 py-1.5 rounded-md text-xs font-medium border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition flex items-center gap-1.5 disabled:opacity-50">
            @if (aiService.progress().status === 'running') {
              <svg class="animate-spin h-3.5 w-3.5 text-purple-300" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Classifying ({{ aiService.progress().completed }}/{{ aiService.progress().total }})...</span>
            } @else {
              <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Classify with AI</span>
            }
          </button>

          <!-- Bulk Unsubscribe Trigger -->
          <button
            type="button"
            (click)="openBulkUnsubscribeModal.emit()"
            [disabled]="subService.selectedCount() === 0"
            class="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition flex items-center gap-1.5 shadow-sm shadow-red-600/30 disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <span>Unsubscribe Selected ({{ subService.selectedCount() }})</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class FilterBarComponent {
  readonly subService = inject(SubscriptionService);
  readonly aiService = inject(AiClassificationService);

  readonly categories = SUGGESTED_CATEGORIES;

  readonly triggerAiClassification = output<void>();
  readonly openBulkUnsubscribeModal = output<void>();
  readonly openExportModal = output<void>();

  onSearchChange(query: string): void {
    this.subService.updateFilter({ searchQuery: query });
  }

  onSortChange(sortBy: SortOption): void {
    this.subService.updateFilter({ sortBy });
  }

  setViewMode(viewMode: ViewMode): void {
    this.subService.updateFilter({ viewMode });
  }
}
