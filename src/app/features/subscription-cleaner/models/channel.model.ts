export interface RecentVideo {
  title: string;
  description: string;
  publishedAt: string;
}

export interface ChannelSubscription {
  // YouTube Subscription metadata
  subscriptionId: string; // The ID required for subscriptions.delete
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl: string;
  channelUrl: string;
  subscribedAt: string;

  // Channel statistics (when retrieved)
  videoCount?: number;
  subscriberCount?: number;
  viewCount?: number;
  recentVideos?: RecentVideo[];

  // AI Classification
  isClassified: boolean;
  categories: string[];
  aiSummary?: string;
  confidence?: number;
  classificationError?: string;

  // User interactions
  isSelected: boolean;
  isFavorite: boolean; // Protected from bulk unsubscribe
  unsubscribeStatus?: 'idle' | 'pending' | 'success' | 'failed';
  unsubscribeError?: string;
}

export interface AIClassificationResult {
  categories: string[];
  summary: string;
  confidence: number;
}

export interface BatchClassificationItem {
  channelId: string;
  categories: string[];
  summary: string;
  confidence: number;
}

export const SUGGESTED_CATEGORIES = [
  'Programming',
  'Software Engineering',
  'DevOps',
  'Cloud Computing',
  'Artificial Intelligence',
  'Technology',
  'Science',
  'Education',
  'Finance',
  'Business',
  'Gaming',
  'Entertainment',
  'Music',
  'Lifestyle',
  'News',
  'Sports',
  'Other'
] as const;

export type ChannelCategory = typeof SUGGESTED_CATEGORIES[number];
