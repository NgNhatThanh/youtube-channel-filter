import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ChannelSubscription,
  AIClassificationResult,
  BatchClassificationItem,
  SUGGESTED_CATEGORIES
} from '../../features/subscription-cleaner/models/channel.model';

export type AIProvider = 'gemini' | 'openai' | 'groq' | 'custom' | 'heuristic';

export interface AISettings {
  provider: AIProvider;
  model: string;
  customEndpoint?: string;
  batchSize: number;
}

export interface ClassificationProgress {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  total: number;
  completed: number;
  currentBatch: number;
  totalBatches: number;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiClassificationService {
  private readonly http = inject(HttpClient);

  // IN-MEMORY ONLY - Never saved to localStorage, never logged
  private apiKey: string | null = null;
  private isCancelled = false;

  readonly settings = signal<AISettings>({
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    batchSize: 5,
    customEndpoint: ''
  });

  readonly progress = signal<ClassificationProgress>({
    status: 'idle',
    total: 0,
    completed: 0,
    currentBatch: 0,
    totalBatches: 0
  });

  readonly hasApiKey = computed(() => !!this.apiKey || this.settings().provider === 'heuristic');

  setApiKey(key: string): void {
    // Trim and store strictly in-memory
    this.apiKey = key.trim() || null;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey(): void {
    this.apiKey = null;
  }

  updateSettings(newSettings: Partial<AISettings>): void {
    this.settings.update(s => ({ ...s, ...newSettings }));
  }

  cancelClassification(): void {
    this.isCancelled = true;
    this.progress.update(p => ({ ...p, status: 'cancelled' }));
  }

  /**
   * Classifies channels in batches using the selected AI provider.
   */
  async classifyChannels(
    channels: ChannelSubscription[],
    forceReclassify = false,
    onChannelUpdated?: (channel: ChannelSubscription) => void
  ): Promise<void> {
    const toClassify = channels.filter(c => forceReclassify || !c.isClassified);
    if (toClassify.length === 0) {
      return;
    }

    const currentSettings = this.settings();
    if (currentSettings.provider !== 'heuristic' && !this.apiKey) {
      throw new Error('Please enter an AI API key to perform classification.');
    }

    this.isCancelled = false;
    const batchSize = Math.max(1, Math.min(10, currentSettings.batchSize || 5));
    const totalBatches = Math.ceil(toClassify.length / batchSize);

    this.progress.set({
      status: 'running',
      total: toClassify.length,
      completed: 0,
      currentBatch: 0,
      totalBatches
    });

    let completedCount = 0;

    for (let i = 0; i < toClassify.length; i += batchSize) {
      if (this.isCancelled) {
        break;
      }

      const batchIndex = Math.floor(i / batchSize) + 1;
      const batch = toClassify.slice(i, i + batchSize);

      this.progress.update(p => ({
        ...p,
        currentBatch: batchIndex
      }));

      try {
        let results: Map<string, AIClassificationResult>;

        if (currentSettings.provider === 'heuristic') {
          results = this.classifyWithHeuristic(batch);
        } else if (currentSettings.provider === 'gemini') {
          results = await this.classifyWithGemini(batch, currentSettings.model);
        } else {
          // OpenAI, Groq, or Custom OpenAI-compatible endpoint
          results = await this.classifyWithOpenAICompatible(batch, currentSettings);
        }

        for (const channel of batch) {
          const res = results.get(channel.channelId);
          if (res) {
            channel.isClassified = true;
            channel.categories = res.categories;
            channel.aiSummary = res.summary;
            channel.confidence = res.confidence;
            channel.classificationError = undefined;
          } else {
            // Fallback for missing item in AI response
            const fallback = this.heuristicChannel(channel);
            channel.isClassified = true;
            channel.categories = fallback.categories;
            channel.aiSummary = fallback.summary;
            channel.confidence = fallback.confidence;
          }
          completedCount++;
          onChannelUpdated?.(channel);
        }

        this.progress.update(p => ({
          ...p,
          completed: completedCount
        }));
      } catch (err: any) {
        // Mark batch with error message
        for (const channel of batch) {
          channel.classificationError = err.message || 'AI Classification failed';
        }

        this.progress.update(p => ({
          ...p,
          errorMessage: `Batch ${batchIndex} failed: ${err.message || 'Error'}`
        }));

        // Allow continuing with remaining batches unless user cancelled
        if (this.isCancelled) break;
      }
    }

    this.progress.update(p => ({
      ...p,
      status: this.isCancelled ? 'cancelled' : 'completed',
      completed: completedCount
    }));
  }

  /**
   * Gemini API call with structured JSON prompt
   */
  private async classifyWithGemini(
    channels: ChannelSubscription[],
    modelName: string
  ): Promise<Map<string, AIClassificationResult>> {
    const model = modelName || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      this.apiKey!
    )}`;

    const prompt = this.buildPrompt(channels);

    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };

    const response: any = await firstValueFrom(this.http.post<any>(url, body));
    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini returned an empty response.');
    }

    return this.parseAndValidateResponse(rawText, channels);
  }

  /**
   * OpenAI / Groq / Custom endpoint with JSON format
   */
  private async classifyWithOpenAICompatible(
    channels: ChannelSubscription[],
    settings: AISettings
  ): Promise<Map<string, AIClassificationResult>> {
    let url = 'https://api.openai.com/v1/chat/completions';
    let model = settings.model || 'gpt-4o-mini';

    if (settings.provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      model = settings.model || 'llama-3.1-8b-instant';
    } else if (settings.provider === 'custom' && settings.customEndpoint) {
      url = settings.customEndpoint.trim();
    }

    const prompt = this.buildPrompt(channels);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    });

    const body = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert YouTube channel topic classifier. Respond ONLY with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    };

    const response: any = await firstValueFrom(this.http.post<any>(url, body, { headers }));
    const rawText = response.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('LLM returned an empty response.');
    }

    return this.parseAndValidateResponse(rawText, channels);
  }

  /**
   * Builds batch prompt with channel data & categories list
   */
  private buildPrompt(channels: ChannelSubscription[]): string {
    const channelItems = channels.map(c => ({
      channelId: c.channelId,
      title: c.title,
      description: c.description ? c.description.substring(0, 300) : '',
      recentVideos: c.recentVideos?.slice(0, 3).map(v => v.title) || []
    }));

    return `Classify the following YouTube channels into topics.

Allowed Categories:
${SUGGESTED_CATEGORIES.join(', ')}

Input Channels:
${JSON.stringify(channelItems, null, 2)}

Instructions:
1. Assign 1 to 3 relevant categories from the Allowed Categories list for each channel.
2. Provide a concise 1-sentence summary of the channel's focus.
3. Provide a confidence score between 0.0 and 1.0.
4. Output must be valid JSON in the following exact format:
{
  "items": [
    {
      "channelId": "CHANNEL_ID",
      "categories": ["Category 1", "Category 2"],
      "summary": "1-sentence summary",
      "confidence": 0.95
    }
  ]
}`;
  }

  /**
   * Validates and parses the AI JSON output into a Map<channelId, AIClassificationResult>
   */
  private parseAndValidateResponse(
    rawText: string,
    channels: ChannelSubscription[]
  ): Map<string, AIClassificationResult> {
    const map = new Map<string, AIClassificationResult>();

    // Remove markdown json fences if present
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('AI response was not valid JSON: ' + rawText.substring(0, 100));
    }

    // Handle array or object with items
    const items: any[] = Array.isArray(parsed) ? parsed : parsed.items || parsed.channels || [];

    for (const item of items) {
      if (!item.channelId) continue;

      const categories: string[] = Array.isArray(item.categories)
        ? item.categories.filter((cat: any) => typeof cat === 'string')
        : ['Other'];

      const summary = typeof item.summary === 'string' && item.summary.trim()
        ? item.summary.trim()
        : 'YouTube channel content.';

      const confidence = typeof item.confidence === 'number'
        ? Math.max(0, Math.min(1, item.confidence))
        : 0.85;

      map.set(item.channelId, {
        categories: categories.length > 0 ? categories : ['Other'],
        summary,
        confidence
      });
    }

    // Fill in any channel in the batch that the AI missed with heuristic
    for (const ch of channels) {
      if (!map.has(ch.channelId)) {
        map.set(ch.channelId, this.heuristicChannel(ch));
      }
    }

    return map;
  }

  /**
   * Built-in intelligent rule & keyword heuristic classifier.
   * Works instantly without an API key for quick previews or offline testing.
   */
  private classifyWithHeuristic(channels: ChannelSubscription[]): Map<string, AIClassificationResult> {
    const map = new Map<string, AIClassificationResult>();
    for (const ch of channels) {
      map.set(ch.channelId, this.heuristicChannel(ch));
    }
    return map;
  }

  private heuristicChannel(ch: ChannelSubscription): AIClassificationResult {
    const text = `${ch.title} ${ch.description || ''} ${ch.recentVideos?.map(v => v.title).join(' ') || ''}`.toLowerCase();

    const matchedCategories: string[] = [];

    const categoryKeywords: Record<string, string[]> = {
      'Programming': ['code', 'coding', 'programming', 'javascript', 'python', 'typescript', 'java', 'c++', 'react', 'angular', 'vue', 'developer', 'web dev', 'frontend', 'backend', 'fullstack'],
      'Software Engineering': ['software engineering', 'architecture', 'system design', 'refactoring', 'algorithms', 'data structures', 'design patterns', 'clean code'],
      'DevOps': ['devops', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'ansible', 'jenkins', 'linux', 'sysadmin', 'bash', 'containers'],
      'Cloud Computing': ['aws', 'azure', 'google cloud', 'gcp', 'cloud', 'serverless', 'lambda', 's3'],
      'Artificial Intelligence': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'llm', 'chatgpt', 'openai', 'gemini', 'claude', 'neural network', 'data science'],
      'Technology': ['tech', 'gadget', 'hardware', 'review', 'smartphone', 'apple', 'google', 'microsoft', 'intel', 'nvidia', 'amd', 'computer'],
      'Science': ['science', 'physics', 'chemistry', 'biology', 'astronomy', 'space', 'nasa', 'universe', 'quantum', 'math', 'mathematics'],
      'Education': ['tutorial', 'course', 'learn', 'lesson', 'education', 'lecture', 'academy', 'university', 'study', 'school'],
      'Finance': ['finance', 'stock', 'investing', 'crypto', 'bitcoin', 'money', 'trading', 'wealth', 'economy', 'market'],
      'Business': ['business', 'entrepreneur', 'startup', 'marketing', 'sales', 'company', 'management', 'ecommerce'],
      'Gaming': ['gaming', 'gameplay', 'game', 'playthrough', 'walkthrough', 'esports', 'minecraft', 'playstation', 'xbox', 'nintendo', 'steam', 'rpg'],
      'Entertainment': ['entertainment', 'comedy', 'funny', 'vlog', 'reaction', 'challenge', 'parody', 'drama', 'movie', 'film', 'series'],
      'Music': ['music', 'song', 'album', 'cover', 'instrumental', 'guitar', 'piano', 'beats', 'soundtrack', 'hip hop', 'pop', 'rock'],
      'Lifestyle': ['lifestyle', 'fitness', 'workout', 'cooking', 'recipe', 'travel', 'food', 'health', 'beauty', 'fashion', 'diy'],
      'News': ['news', 'politics', 'journalism', 'daily', 'report', 'bulletin', 'current events', 'breaking'],
      'Sports': ['sports', 'football', 'soccer', 'basketball', 'nba', 'tennis', 'highlights', 'championship', 'athlete']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(k => text.includes(k))) {
        matchedCategories.push(category);
        if (matchedCategories.length >= 3) break;
      }
    }

    if (matchedCategories.length === 0) {
      matchedCategories.push('Other');
    }

    return {
      categories: matchedCategories,
      summary: ch.description ? ch.description.slice(0, 120) + '...' : `Content created by ${ch.title}`,
      confidence: matchedCategories.includes('Other') ? 0.6 : 0.85
    };
  }
}
