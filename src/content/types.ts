// Content Script 类型定义

export interface ContentMessageRequest {
  action: 'getUserPostedFeeds' | 'getSearchResultFeeds';
}

export interface FeedSection {
  index: number;
  noteId?: string;
  link?: string;
  coverImage?: string;
  title?: string;
  authorName?: string;
  authorAvatar?: string;
  authorLink?: string;
  likeCount?: string;
  dataWidth?: string;
  dataHeight?: string;
}

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface FeedsResponseData {
  feeds: FeedSection[];
  count: number;
  timestamp: string;
  url: string;
}

export interface FeedsResponse extends MessageResponse {
  data?: FeedsResponseData;
}

