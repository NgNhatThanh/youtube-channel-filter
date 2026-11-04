import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { AiClassificationService } from '../../../../core/services/ai-classification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-[#121212] border-b border-neutral-800 sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-md">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Brand / Title -->
        <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-base font-bold text-white tracking-tight flex items-center gap-2">
                YouTube Subscription Cleaner
                <span class="text-[10px] font-semibold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">v1.0</span>
              </h1>
              <p class="text-xs text-neutral-400 hidden sm:block">AI-powered subscription organizer & bulk cleaner</p>
            </div>
          </div>

          <!-- Quick Setup Trigger on Mobile -->
          <button
            type="button"
            (click)="openSettings.emit()"
            class="sm:hidden text-xs text-neutral-400 hover:text-white p-2"
            title="OAuth & AI Settings">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
        </div>

        <!-- Right Side: Auth & Session Actions -->
        <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <!-- Client ID Setup / Indicator -->
          <button
            type="button"
            (click)="openClientIdModal.emit()"
            class="text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5"
            [ngClass]="authService.clientId() ? 'border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700' : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'">
            <span class="w-2 h-2 rounded-full" [ngClass]="authService.clientId() ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'"></span>
            <span class="hidden md:inline">{{ authService.clientId() ? 'OAuth Ready' : 'Set Google Client ID' }}</span>
            <span class="md:hidden">OAuth</span>
          </button>

          <!-- AI Configuration Button -->
          <button
            type="button"
            (click)="openAiSettings.emit()"
            class="text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5"
            [ngClass]="aiService.hasApiKey() ? 'border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700' : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white'">
            <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span class="hidden md:inline">AI Config</span>
            <span class="text-[10px] px-1 py-0.2 rounded bg-neutral-700 text-neutral-300 uppercase">{{ aiService.settings().provider }}</span>
          </button>

          <!-- Connect YouTube Button (when not authenticated) -->
          @if (!authService.isAuthenticated()) {
            <button
              type="button"
              (click)="authService.connect()"
              [disabled]="authService.isLoading()"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              @if (authService.isLoading()) {
                <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Connecting...</span>
              } @else {
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Connect YouTube</span>
              }
            </button>
          } @else {
            <!-- Connected User Information & Disconnect -->
            <div class="flex items-center gap-2 bg-neutral-800/90 border border-neutral-700/80 rounded-md px-2.5 py-1">
              @if (authService.currentUser()?.picture) {
                <img
                  [src]="authService.currentUser()?.picture"
                  [alt]="authService.currentUser()?.name || 'User'"
                  class="w-6 h-6 rounded-full border border-neutral-600 object-cover" />
              } @else {
                <div class="w-6 h-6 rounded-full bg-red-600/40 text-red-200 flex items-center justify-center text-xs font-semibold">
                  {{ authService.currentUser()?.name?.charAt(0) || 'Y' }}
                </div>
              }
              <div class="flex flex-col text-left leading-none max-w-[120px] sm:max-w-[150px]">
                <span class="text-xs font-medium text-neutral-200 truncate">{{ authService.currentUser()?.name || 'Connected' }}</span>
                <span class="text-[10px] text-neutral-400 truncate">{{ authService.currentUser()?.email || '' }}</span>
              </div>
              <button
                type="button"
                (click)="disconnect()"
                class="ml-1 text-[11px] text-neutral-400 hover:text-red-400 p-1 rounded hover:bg-neutral-700/60 transition"
                title="Disconnect Google Account">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  readonly subscriptionService = inject(SubscriptionService);
  readonly aiService = inject(AiClassificationService);

  readonly openClientIdModal = output<void>();
  readonly openAiSettings = output<void>();
  readonly openSettings = output<void>();

  disconnect(): void {
    if (confirm('Disconnect YouTube and clear all temporary data from this session?')) {
      this.authService.disconnect();
      this.subscriptionService.clearAllData();
      this.aiService.clearApiKey();
    }
  }
}
