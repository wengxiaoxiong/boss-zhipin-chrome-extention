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

export interface UserInfo {
  nickname?: string;
  redId?: string;
  avatar?: string;
  description?: string;
  tags?: string[];
  gender?: 'male' | 'female';
  location?: string;
  followingCount?: string;
  followersCount?: string;
  likesAndCollectionsCount?: string;
}

export interface FeedsResponseData {
  feeds: FeedSection[];
  count: number;
  timestamp: string;
  url: string;
  userInfo?: UserInfo; // 仅在 userProfile 模式下存在
}

export interface FeedsResponse extends MessageResponse {
  data?: FeedsResponseData;
}

// 自动更新消息类型（增量更新）
export interface FeedsUpdatedMessage {
  action: 'feedsUpdated';
  data: {
    newFeeds: FeedSection[]; // 只包含新增的 feeds
    totalCount: number; // 当前总数量
    timestamp: string;
    url: string;
  };
}

