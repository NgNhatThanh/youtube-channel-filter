import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { SubscriptionService } from './core/services/subscription.service';
import { AiClassificationService } from './core/services/ai-classification.service';
import { AuthService } from './core/auth/auth.service';
import { ChannelSubscription } from './features/subscription-cleaner/models/channel.model';

describe('YouTube Subscription Cleaner Tests', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('should create the main application component', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should manage subscription channels and filters correctly', () => {
    const subService = TestBed.inject(SubscriptionService);
    expect(subService.totalCount()).toBe(0);

    // Add channels
    subService.setChannels([
      {
        subscriptionId: 'sub-1',
        channelId: 'ch-1',
        title: 'Angular Mastery',
        description: 'Advanced Angular and TypeScript techniques',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        channelUrl: 'https://youtube.com/@angularmastery',
        subscribedAt: '2023-01-01T00:00:00Z',
        isClassified: true,
        categories: ['Programming', 'Software Engineering'],
        confidence: 0.95,
        isSelected: false,
        isFavorite: false
      },
      {
        subscriptionId: 'sub-2',
        channelId: 'ch-2',
        title: 'Retro Gaming Club',
        description: 'Gameplay of old classic games',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        channelUrl: 'https://youtube.com/@retrogaming',
        subscribedAt: '2022-01-01T00:00:00Z',
        isClassified: false,
        categories: [],
        isSelected: false,
        isFavorite: false
      }
    ]);

    expect(subService.totalCount()).toBe(2);
    expect(subService.classifiedCount()).toBe(1);
    expect(subService.unclassifiedCount()).toBe(1);

    // Test Selection
    subService.toggleSelect('ch-2');
    expect(subService.selectedCount()).toBe(1);

    // Test Favorite protection: Favoriting protects channel and clears selection
    subService.toggleFavorite('ch-2');
    expect(subService.favoritesCount()).toBe(1);
    expect(subService.selectedCount()).toBe(0); // must be 0 because favorite channel cannot be selected

    // Attempting to select favorite channel should be blocked
    subService.toggleSelect('ch-2');
    expect(subService.selectedCount()).toBe(0);

    // Test search filter
    subService.updateFilter({ searchQuery: 'Angular' });
    expect(subService.filteredChannels().length).toBe(1);
    expect(subService.filteredChannels()[0].title).toBe('Angular Mastery');

    // Test category filter
    subService.updateFilter({ searchQuery: '', selectedCategories: ['Programming'] });
    expect(subService.filteredChannels().length).toBe(1);

    subService.updateFilter({ selectedCategories: ['NonExistent'] });
    expect(subService.filteredChannels().length).toBe(0);
  });

  it('should test heuristic offline AI classification', async () => {
    const aiService = TestBed.inject(AiClassificationService);
    aiService.updateSettings({ provider: 'heuristic' });

    const testChannel: ChannelSubscription = {
      subscriptionId: 'sub-3',
      channelId: 'ch-3',
      title: 'DevOps & Cloud Computing Daily',
      description: 'Docker, Kubernetes, AWS tutorials and CI/CD pipelines',
      thumbnailUrl: '',
      channelUrl: '',
      subscribedAt: '',
      isClassified: false,
      categories: [],
      isSelected: false,
      isFavorite: false
    };

    await aiService.classifyChannels([testChannel]);

    expect(testChannel.isClassified).toBeTrue();
    expect(testChannel.categories).toContain('DevOps');
    expect(testChannel.confidence).toBeGreaterThan(0.7);
  });

  it('should protect API key and OAuth token in-memory', () => {
    const aiService = TestBed.inject(AiClassificationService);
    aiService.setApiKey('test-secret-key-12345');
    expect(aiService.getApiKey()).toBe('test-secret-key-12345');

    // Clears on session end
    aiService.clearApiKey();
    expect(aiService.getApiKey()).toBeNull();
    expect(localStorage.getItem('test-secret-key-12345')).toBeNull();
  });
});
