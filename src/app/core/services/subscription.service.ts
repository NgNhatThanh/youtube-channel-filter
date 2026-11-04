import { Injectable, signal, computed } from '@angular/core';
import { ChannelSubscription } from '../../features/subscription-cleaner/models/channel.model';
import { FilterState, SortOption, FilterStatus, ViewMode } from '../../features/subscription-cleaner/models/filter.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  // Primary In-Memory Channel State
  readonly channels = signal<ChannelSubscription[]>([]);

  // Filter & Search State
  readonly filterState = signal<FilterState>({
    searchQuery: '',
    selectedCategories: [],
    filterStatus: 'all',
    sortBy: 'title-asc',
    viewMode: 'grid',
    minVideos: undefined
  });

  // Computed Statistics
  readonly totalCount = computed(() => this.channels().length);
  readonly classifiedCount = computed(() => this.channels().filter(c => c.isClassified).length);
  readonly unclassifiedCount = computed(() => this.channels().filter(c => !c.isClassified).length);
  readonly selectedCount = computed(() => this.channels().filter(c => c.isSelected && !c.isFavorite).length);
  readonly favoritesCount = computed(() => this.channels().filter(c => c.isFavorite).length);

  // Available unique categories present in current channels
  readonly availableCategories = computed(() => {
    const set = new Set<string>();
    for (const ch of this.channels()) {
      for (const cat of ch.categories) {
        set.add(cat);
      }
    }
    return Array.from(set).sort();
  });

  // Filtered & Sorted Channels
  readonly filteredChannels = computed(() => {
    const list = this.channels();
    const filter = this.filterState();

    return list.filter(ch => {
      // 1. Search Query filter (matches title or description or customUrl)
      if (filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase().trim();
        const matchesTitle = ch.title.toLowerCase().includes(query);
        const matchesDesc = (ch.description || '').toLowerCase().includes(query);
        const matchesCustom = (ch.customUrl || '').toLowerCase().includes(query);
        const matchesSummary = (ch.aiSummary || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCustom && !matchesSummary) {
          return false;
        }
      }

      // 2. Filter Status
      switch (filter.filterStatus) {
        case 'classified':
          if (!ch.isClassified) return false;
          break;
        case 'unclassified':
          if (ch.isClassified) return false;
          break;
        case 'selected':
          if (!ch.isSelected) return false;
          break;
        case 'favorites':
          if (!ch.isFavorite) return false;
          break;
      }

      // 3. Category filter (channel must match ALL or ANY selected category; any makes multi-tag browse intuitive)
      if (filter.selectedCategories.length > 0) {
        const hasCategory = filter.selectedCategories.some(cat => ch.categories.includes(cat));
        if (!hasCategory) return false;
      }

      // 4. Min Videos / Channel activity filter
      if (filter.minVideos !== undefined && ch.videoCount !== undefined) {
        if (ch.videoCount < filter.minVideos) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      switch (filter.sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'subscribed-desc':
          return new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime();
        case 'subscribed-asc':
          return new Date(a.subscribedAt).getTime() - new Date(b.subscribedAt).getTime();
        case 'videos-desc':
          return (b.videoCount || 0) - (a.videoCount || 0);
        case 'confidence-desc':
          return (b.confidence || 0) - (a.confidence || 0);
        default:
          return 0;
      }
    });
  });

  // Selected Channels (strictly excluding favorites)
  readonly selectedChannels = computed(() => {
    return this.channels().filter(c => c.isSelected && !c.isFavorite);
  });

  setChannels(newChannels: ChannelSubscription[]): void {
    this.channels.set(newChannels);
  }

  updateChannel(channelId: string, updates: Partial<ChannelSubscription>): void {
    this.channels.update(items =>
      items.map(ch => (ch.channelId === channelId ? { ...ch, ...updates } : ch))
    );
  }

  toggleSelect(channelId: string): void {
    this.channels.update(items =>
      items.map(ch => {
        if (ch.channelId === channelId) {
          // If channel is favorite, it cannot be selected
          if (ch.isFavorite) return ch;
          return { ...ch, isSelected: !ch.isSelected };
        }
        return ch;
      })
    );
  }

  toggleFavorite(channelId: string): void {
    this.channels.update(items =>
      items.map(ch => {
        if (ch.channelId === channelId) {
          const nextFav = !ch.isFavorite;
          // Protected channels cannot be selected
          return {
            ...ch,
            isFavorite: nextFav,
            isSelected: nextFav ? false : ch.isSelected
          };
        }
        return ch;
      })
    );
  }

  selectAllFiltered(): void {
    const filteredIds = new Set(this.filteredChannels().map(c => c.channelId));
    this.channels.update(items =>
      items.map(ch => {
        if (filteredIds.has(ch.channelId) && !ch.isFavorite) {
          return { ...ch, isSelected: true };
        }
        return ch;
      })
    );
  }

  clearSelection(): void {
    this.channels.update(items => items.map(ch => ({ ...ch, isSelected: false })));
  }

  updateFilter(updates: Partial<FilterState>): void {
    this.filterState.update(f => ({ ...f, ...updates }));
  }

  toggleCategoryFilter(category: string): void {
    this.filterState.update(f => {
      const exists = f.selectedCategories.includes(category);
      const selectedCategories = exists
        ? f.selectedCategories.filter(c => c !== category)
        : [...f.selectedCategories, category];
      return { ...f, selectedCategories };
    });
  }

  clearCategoryFilters(): void {
    this.filterState.update(f => ({ ...f, selectedCategories: [] }));
  }

  removeUnsubscribedChannels(): void {
    this.channels.update(items => items.filter(ch => ch.unsubscribeStatus !== 'success'));
  }

  clearAllData(): void {
    this.channels.set([]);
    this.filterState.set({
      searchQuery: '',
      selectedCategories: [],
      filterStatus: 'all',
      sortBy: 'title-asc',
      viewMode: 'grid',
      minVideos: undefined
    });
  }

  // Export functions (JSON / CSV)
  exportAsJson(onlySelected = false): void {
    const list = onlySelected ? this.selectedChannels() : this.channels();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(list, null, 2));
    const filename = onlySelected ? 'youtube-selected-subscriptions.json' : 'youtube-all-subscriptions.json';
    this.triggerDownload(dataStr, filename);
  }

  exportAsCsv(onlySelected = false): void {
    const list = onlySelected ? this.selectedChannels() : this.channels();
    const headers = ['Channel Title', 'Channel ID', 'Subscription ID', 'Categories', 'Subscribed At', 'Video Count', 'Channel URL', 'AI Summary'];
    const rows = list.map(c => [
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.channelId}"`,
      `"${c.subscriptionId}"`,
      `"${c.categories.join('; ')}"`,
      `"${c.subscribedAt}"`,
      c.videoCount ?? '',
      `"${c.channelUrl}"`,
      `"${(c.aiSummary || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
    const filename = onlySelected ? 'youtube-selected-subscriptions.csv' : 'youtube-all-subscriptions.csv';
    this.triggerDownload(csvContent, filename);
  }

  private triggerDownload(uri: string, filename: string): void {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', uri);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
