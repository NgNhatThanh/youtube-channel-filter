export type FilterStatus = 'all' | 'classified' | 'unclassified' | 'selected' | 'favorites';

export type SortOption =
  | 'title-asc'
  | 'title-desc'
  | 'subscribed-desc'
  | 'subscribed-asc'
  | 'videos-desc'
  | 'confidence-desc';

export type ViewMode = 'grid' | 'table';

export interface FilterState {
  searchQuery: string;
  selectedCategories: string[];
  filterStatus: FilterStatus;
  sortBy: SortOption;
  viewMode: ViewMode;
  minVideos?: number;
}
