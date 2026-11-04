import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionService } from '../../../../core/services/subscription.service';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-[#181818] border border-neutral-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Export Channels</h3>
              <p class="text-xs text-neutral-400">Download your channel subscription data</p>
            </div>
          </div>
          <button
            type="button"
            (click)="closeModal.emit()"
            class="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 flex flex-col gap-4 text-xs">
          <!-- Scope Option 1: All Subscriptions -->
          <div class="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
            <div>
              <div class="font-bold text-neutral-200">All Subscriptions ({{ subService.totalCount() }})</div>
              <div class="text-[11px] text-neutral-500">Export complete list of all fetched channels</div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="exportJson(false)"
                [disabled]="subService.totalCount() === 0"
                class="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition disabled:opacity-40">
                JSON
              </button>
              <button
                type="button"
                (click)="exportCsv(false)"
                [disabled]="subService.totalCount() === 0"
                class="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition disabled:opacity-40">
                CSV
              </button>
            </div>
          </div>

          <!-- Scope Option 2: Selected Subscriptions -->
          <div class="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
            <div>
              <div class="font-bold text-neutral-200">Selected Channels ({{ subService.selectedCount() }})</div>
              <div class="text-[11px] text-neutral-500">Export only the currently selected channels</div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="exportJson(true)"
                [disabled]="subService.selectedCount() === 0"
                class="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition disabled:opacity-40">
                JSON
              </button>
              <button
                type="button"
                (click)="exportCsv(true)"
                [disabled]="subService.selectedCount() === 0"
                class="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition disabled:opacity-40">
                CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-neutral-800 flex items-center justify-end bg-neutral-900/50">
          <button
            type="button"
            (click)="closeModal.emit()"
            class="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class ExportModalComponent {
  readonly subService = inject(SubscriptionService);
  readonly closeModal = output<void>();

  exportJson(onlySelected: boolean): void {
    this.subService.exportAsJson(onlySelected);
  }

  exportCsv(onlySelected: boolean): void {
    this.subService.exportAsCsv(onlySelected);
  }
}
