import { Component, inject, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiClassificationService, AIProvider, AISettings } from '../../../../core/services/ai-classification.service';

@Component({
  selector: 'app-ai-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div class="bg-[#181818] border border-neutral-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">AI Topic Classification Settings</h3>
              <p class="text-xs text-neutral-400">Configure provider, model & in-memory session API key</p>
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
          <!-- Security Notice -->
          <div class="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 flex items-start gap-2">
            <svg class="w-4 h-4 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <div>
              <strong class="font-semibold block">In-Memory Privacy Guarantee:</strong>
              Your API key is kept solely in application memory during this session. It is never persisted in localStorage or logs and is cleared immediately when you disconnect.
            </div>
          </div>

          <!-- Provider Selection -->
          <div>
            <label class="block text-neutral-300 font-medium mb-1.5">AI Provider</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                (click)="selectProvider('gemini')"
                class="p-2.5 rounded-lg border text-left transition"
                [ngClass]="provider === 'gemini' ? 'border-purple-500 bg-purple-950/30 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'">
                <div class="font-semibold">Google Gemini</div>
                <div class="text-[10px] text-neutral-500">1.5 Flash / 2.0 Flash</div>
              </button>

              <button
                type="button"
                (click)="selectProvider('openai')"
                class="p-2.5 rounded-lg border text-left transition"
                [ngClass]="provider === 'openai' ? 'border-purple-500 bg-purple-950/30 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'">
                <div class="font-semibold">OpenAI</div>
                <div class="text-[10px] text-neutral-500">gpt-4o-mini</div>
              </button>

              <button
                type="button"
                (click)="selectProvider('groq')"
                class="p-2.5 rounded-lg border text-left transition"
                [ngClass]="provider === 'groq' ? 'border-purple-500 bg-purple-950/30 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'">
                <div class="font-semibold">Groq</div>
                <div class="text-[10px] text-neutral-500">Llama 3.1 8B (Fast)</div>
              </button>

              <button
                type="button"
                (click)="selectProvider('heuristic')"
                class="p-2.5 rounded-lg border text-left transition"
                [ngClass]="provider === 'heuristic' ? 'border-emerald-500 bg-emerald-950/30 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'">
                <div class="font-semibold text-emerald-400">Offline Rules</div>
                <div class="text-[10px] text-neutral-500">No API key required</div>
              </button>

              <button
                type="button"
                (click)="selectProvider('custom')"
                class="p-2.5 rounded-lg border text-left transition col-span-2"
                [ngClass]="provider === 'custom' ? 'border-purple-500 bg-purple-950/30 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'">
                <div class="font-semibold">Custom / Local Proxy</div>
                <div class="text-[10px] text-neutral-500">OpenAI-compatible server or proxy URL</div>
              </button>
            </div>
          </div>

          <!-- API Key Input (if not heuristic) -->
          @if (provider !== 'heuristic') {
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-neutral-300 font-medium">API Key</label>
                <button
                  type="button"
                  (click)="showKey = !showKey"
                  class="text-[11px] text-neutral-400 hover:text-white transition">
                  {{ showKey ? 'Hide Key' : 'Show Key' }}
                </button>
              </div>
              <input
                [type]="showKey ? 'text' : 'password'"
                [(ngModel)]="apiKeyInput"
                placeholder="Enter your API key..."
                class="w-full bg-[#121212] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono" />
            </div>
          }

          <!-- Custom Endpoint (if custom) -->
          @if (provider === 'custom') {
            <div>
              <label class="block text-neutral-300 font-medium mb-1.5">Proxy / Base URL</label>
              <input
                type="text"
                [(ngModel)]="customEndpoint"
                placeholder="https://api.openai.com/v1/chat/completions or http://localhost:8000/v1/..."
                class="w-full bg-[#121212] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono" />
            </div>
          }

          <!-- Model Name & Batch Size -->
          <div class="grid grid-cols-2 gap-3">
            @if (provider !== 'heuristic') {
              <div>
                <label class="block text-neutral-300 font-medium mb-1.5">Model Name</label>
                <input
                  type="text"
                  [(ngModel)]="model"
                  class="w-full bg-[#121212] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-purple-500 font-mono" />
              </div>
            }

            <div [ngClass]="provider === 'heuristic' ? 'col-span-2' : ''">
              <label class="block text-neutral-300 font-medium mb-1.5">
                Batch Size: <span class="text-purple-400 font-bold">{{ batchSize }} channels / request</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                [(ngModel)]="batchSize"
                class="w-full accent-purple-500 cursor-pointer" />
              <div class="flex justify-between text-[10px] text-neutral-500 mt-1">
                <span>1 (Precise)</span>
                <span>5 (Recommended)</span>
                <span>10 (Fastest)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/50">
          <button
            type="button"
            (click)="closeModal.emit()"
            class="px-4 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition">
            Cancel
          </button>
          <button
            type="button"
            (click)="saveSettings()"
            class="px-5 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-lg shadow-purple-600/30">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  `
})
export class AiSettingsModalComponent implements OnInit {
  private readonly aiService = inject(AiClassificationService);

  readonly closeModal = output<void>();

  provider: AIProvider = 'gemini';
  model = 'gemini-1.5-flash';
  customEndpoint = '';
  batchSize = 5;
  apiKeyInput = '';
  showKey = false;

  ngOnInit(): void {
    const current = this.aiService.settings();
    this.provider = current.provider;
    this.model = current.model;
    this.customEndpoint = current.customEndpoint || '';
    this.batchSize = current.batchSize || 5;
    this.apiKeyInput = this.aiService.getApiKey() || '';
  }

  selectProvider(p: AIProvider): void {
    this.provider = p;
    if (p === 'gemini') {
      this.model = 'gemini-1.5-flash';
    } else if (p === 'openai') {
      this.model = 'gpt-4o-mini';
    } else if (p === 'groq') {
      this.model = 'llama-3.1-8b-instant';
    } else if (p === 'heuristic') {
      this.model = 'rules-engine';
    }
  }

  saveSettings(): void {
    this.aiService.updateSettings({
      provider: this.provider,
      model: this.model,
      customEndpoint: this.customEndpoint,
      batchSize: Number(this.batchSize) || 5
    });

    if (this.provider !== 'heuristic') {
      this.aiService.setApiKey(this.apiKeyInput);
    }

    this.closeModal.emit();
  }
}
