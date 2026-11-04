import { Component, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-client-id-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-[#181818] border border-neutral-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Google OAuth 2.0 Configuration</h3>
              <p class="text-xs text-neutral-400">Set OAuth Web Client ID for YouTube Data API</p>
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
          <div>
            <label class="block text-neutral-300 font-medium mb-1.5">OAuth 2.0 Client ID (Web Application)</label>
            <input
              type="text"
              [(ngModel)]="clientIdInput"
              placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
              class="w-full bg-[#121212] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-mono" />
            <p class="text-[11px] text-neutral-500 mt-1">
              You can set this here or in <code class="text-neutral-300">src/environments/environment.ts</code>.
            </p>
          </div>

          <!-- Instructions Box -->
          <div class="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-2">
            <span class="text-neutral-300 font-semibold block">Quick 2-Minute Google Cloud Setup:</span>
            <ol class="list-decimal list-inside space-y-1.5 text-neutral-400 leading-relaxed text-[11px]">
              <li>
                Open <a href="https://console.cloud.google.com/" target="_blank" class="text-blue-400 underline">Google Cloud Console</a> and create or select a project.
              </li>
              <li>
                Enable <strong>YouTube Data API v3</strong> under <em>APIs & Services &gt; Library</em>.
              </li>
              <li>
                Configure the <strong>OAuth Consent Screen</strong> (User Type: External, add your test email under Test Users).
              </li>
              <li>
                Go to <strong>Credentials &gt; Create Credentials &gt; OAuth Client ID</strong>.
              </li>
              <li>
                Choose <strong>Web Application</strong>.
              </li>
              <li>
                Under <strong>Authorized JavaScript origins</strong>, add your local or production origin:
                <div class="mt-1 bg-black/60 p-1.5 rounded font-mono text-neutral-300 flex items-center justify-between">
                  <span>{{ currentOrigin }}</span>
                  <button
                    type="button"
                    (click)="copyOrigin()"
                    class="text-blue-400 hover:text-blue-300 ml-2">
                    {{ copied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </li>
              <li>
                Copy the generated <strong>Client ID</strong> and paste it above!
              </li>
            </ol>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/50">
          <button
            type="button"
            (click)="closeModal.emit()"
            class="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition">
            Close
          </button>
          <button
            type="button"
            (click)="saveClientId()"
            class="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg shadow-blue-600/30">
            Save Client ID
          </button>
        </div>
      </div>
    </div>
  `
})
export class ClientIdModalComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly closeModal = output<void>();

  clientIdInput = '';
  currentOrigin = '';
  copied = false;

  ngOnInit(): void {
    this.clientIdInput = this.authService.clientId();
    this.currentOrigin = window.location.origin;
  }

  copyOrigin(): void {
    navigator.clipboard.writeText(this.currentOrigin);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }

  saveClientId(): void {
    this.authService.setClientId(this.clientIdInput);
    this.closeModal.emit();
  }
}
