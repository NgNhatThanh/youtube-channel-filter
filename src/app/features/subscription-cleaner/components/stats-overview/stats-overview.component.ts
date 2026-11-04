import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { FilterStatus } from '../../models/filter.model';

@Component({
  selector: 'app-stats-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <!-- Total Subscriptions -->
      <button
        type="button"
        (click)="setStatusFilter('all')"
        class="text-left bg-[#1A1A1A] hover:bg-[#222222] border transition rounded-lg p-3.5 flex flex-col justify-between shadow-sm"
        [ngClass]="activeStatus() === 'all' ? 'border-neutral-500 ring-1 ring-neutral-500' : 'border-neutral-800'">
        <div class="flex items-center justify-between text-neutral-400 mb-1">
          <span class="text-xs font-medium uppercase tracking-wider">Total</span>
          <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-white">{{ subService.totalCount() }}</span>
          <span class="text-xs text-neutral-500">channels</span>
        </div>
      </button>

      <!-- Classified Channels -->
      <button
        type="button"
        (click)="setStatusFilter('classified')"
        class="text-left bg-[#1A1A1A] hover:bg-[#222222] border transition rounded-lg p-3.5 flex flex-col justify-between shadow-sm"
        [ngClass]="activeStatus() === 'classified' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-neutral-800'">
        <div class="flex items-center justify-between text-neutral-400 mb-1">
          <span class="text-xs font-medium uppercase tracking-wider">Classified</span>
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-emerald-400">{{ subService.classifiedCount() }}</span>
          <span class="text-xs text-neutral-500">
            {{ subService.totalCount() > 0 ? ((subService.classifiedCount() / subService.totalCount()) * 100 | number:'1.0-0') : 0 }}%
          </span>
        </div>
      </button>

      <!-- Unclassified Channels -->
      <button
        type="button"
        (click)="setStatusFilter('unclassified')"
        class="text-left bg-[#1A1A1A] hover:bg-[#222222] border transition rounded-lg p-3.5 flex flex-col justify-between shadow-sm"
        [ngClass]="activeStatus() === 'unclassified' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-neutral-800'">
        <div class="flex items-center justify-between text-neutral-400 mb-1">
          <span class="text-xs font-medium uppercase tracking-wider">Unclassified</span>
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-amber-400">{{ subService.unclassifiedCount() }}</span>
          <span class="text-xs text-neutral-500">remaining</span>
        </div>
      </button>

      <!-- Selected Channels -->
      <button
        type="button"
        (click)="setStatusFilter('selected')"
        class="text-left bg-[#1A1A1A] hover:bg-[#222222] border transition rounded-lg p-3.5 flex flex-col justify-between shadow-sm"
        [ngClass]="activeStatus() === 'selected' ? 'border-red-500 ring-1 ring-red-500' : 'border-neutral-800'">
        <div class="flex items-center justify-between text-neutral-400 mb-1">
          <span class="text-xs font-medium uppercase tracking-wider">Selected</span>
          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-red-500">{{ subService.selectedCount() }}</span>
          <span class="text-xs text-neutral-500">to clean</span>
        </div>
      </button>

      <!-- Favorite / Protected Channels -->
      <button
        type="button"
        (click)="setStatusFilter('favorites')"
        class="col-span-2 sm:col-span-1 text-left bg-[#1A1A1A] hover:bg-[#222222] border transition rounded-lg p-3.5 flex flex-col justify-between shadow-sm"
        [ngClass]="activeStatus() === 'favorites' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-neutral-800'">
        <div class="flex items-center justify-between text-neutral-400 mb-1">
          <span class="text-xs font-medium uppercase tracking-wider">Protected</span>
          <svg class="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-yellow-400">{{ subService.favoritesCount() }}</span>
          <span class="text-xs text-neutral-500">safe</span>
        </div>
      </button>
    </div>
  `
})
export class StatsOverviewComponent {
  readonly subService = inject(SubscriptionService);

  activeStatus(): FilterStatus {
    return this.subService.filterState().filterStatus;
  }

  setStatusFilter(status: FilterStatus): void {
    this.subService.updateFilter({ filterStatus: status });
  }
}
