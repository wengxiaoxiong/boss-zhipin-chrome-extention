// Content Script - 获取小红书个人主页数据
import type {
  ContentMessageRequest,
  FeedsResponse,
  MessageResponse,
  FeedsUpdatedMessage,
  FeedSection,
} from './types';
import { parseFeedsFromContainer, parseUserInfo } from './parser';

console.log('Content script loaded');

/**
 * 处理获取搜索结果页面的笔记数据
 */
function handleGetSearchResultFeeds(
  sendResponse: (response: FeedsResponse) => void
): boolean {
  console.log('[Content Script] 开始处理 getSearchResultFeeds');
  
  try {
    const feedsContainer = document.querySelector('.feeds-container');
    
    if (!feedsContainer) {
      console.log('[Content Script] 未找到 .feeds-container 元素，请确保当前页面是小红书搜索结果页');
      sendResponse({
        success: false,
        error: '未找到 .feeds-container 元素，请确保当前页面是小红书搜索结果页',
      });
      return true;
    }
    
    const feeds = parseFeedsFromContainer(feedsContainer, 'search');
    
    if (feeds.length === 0) {
      sendResponse({
        success: false,
        error: '未找到任何笔记 section，可能页面还未加载完成',
      });
      return true;
    }
    
    const response: FeedsResponse = {
      success: true,
      data: {
        feeds,
        count: feeds.length,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
    };
    
    console.log('[Content Script] 准备发送响应:', response);
    sendResponse(response);
    console.log('[Content Script] 响应已发送');
  } catch (error) {
    console.error('[Content Script] Error getting search result feeds:', error);
    const errorResponse: FeedsResponse = {
      success: false,
      error: String(error),
    };
    console.log('[Content Script] 准备发送错误响应:', errorResponse);
    sendResponse(errorResponse);
    console.log('[Content Script] 错误响应已发送');
  }
  
  return true;
}

/**
 * 处理获取个人主页的笔记数据
 */
function handleGetUserPostedFeeds(
  sendResponse: (response: FeedsResponse) => void
): boolean {
  console.log('[Content Script] 开始处理 getUserPostedFeeds');
  
  try {
    const userPostedFeeds = document.querySelector('#userPostedFeeds');
    
    if (!userPostedFeeds) {
      sendResponse({
        success: false,
        error: '未找到 #userPostedFeeds 元素，请确保当前页面是小红书个人主页',
      });
      return true;
    }
    
    const feeds = parseFeedsFromContainer(userPostedFeeds, 'user');
    
    if (feeds.length === 0) {
      sendResponse({
        success: false,
        error: '未找到任何笔记 section，可能页面还未加载完成',
      });
      return true;
    }
    
    // 获取用户信息
    const userInfo = parseUserInfo();
    
    const response: FeedsResponse = {
      success: true,
      data: {
        feeds,
        count: feeds.length,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userInfo, // 添加用户信息
      },
    };
    
    sendResponse(response);
  } catch (error) {
    console.error('[Content Script] Error getting user posted feeds:', error);
    sendResponse({
      success: false,
      error: String(error),
    });
  }
  
  return true;
}

/**
 * 监听 DOM 变化并自动发送更新消息
 * 使用防抖来避免频繁触发
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let currentObserver: MutationObserver | null = null;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
let scrollHandler: ((event: Event) => void) | null = null;
let isCheckingFeeds = false; // 防止并发检查的锁
const DEBOUNCE_DELAY = 500; // 500ms 防抖延迟
const SCROLL_DEBOUNCE_DELAY = 1000; // 滚动防抖延迟 1秒
const SCROLL_THRESHOLD = 300; // 距离底部 300px 时触发更新

// 使用 Map 存储已见过的 feeds，key 是唯一标识（用于去重）
const seenFeedsMap = new Map<string, FeedSection>();

/**
 * 获取 feed 的唯一标识（优先使用 noteId，因为它是唯一标识符）
 * 如果没有 noteId，则使用 link（通常包含 noteId）
 * 最后才使用 title（因为不同笔记可能有相同标题）
 */
function getFeedKey(feed: FeedSection): string {
  // 优先使用 noteId（最可靠的唯一标识）
  if (feed.noteId) {
    return `noteId:${feed.noteId}`;
  }
  // 其次使用 link（通常包含 noteId，且是唯一的）
  if (feed.link) {
    return `link:${feed.link}`;
  }
  // 最后使用 title（但加上作者名作为组合键，提高唯一性）
  if (feed.title) {
    const authorPart = feed.authorName ? `:${feed.authorName}` : '';
    return `title:${feed.title}${authorPart}`;
  }
  // 如果都没有，使用 index（这种情况应该很少）
  return `index:${feed.index}`;
}

/**
 * 检查并更新 feeds（提取新增的 feeds 并发送更新消息）
 * 使用锁机制防止并发执行
 */
function checkAndUpdateFeeds(container: Element, context: 'search' | 'user', reason: string = '') {
  // 如果正在检查，跳过本次调用（防止并发）
  if (isCheckingFeeds) {
    console.log(`[Content Script] ${reason}，但已有检查正在进行，跳过本次调用`);
    return;
  }
  
  isCheckingFeeds = true;
  
  try {
    const allFeeds = parseFeedsFromContainer(container, context);
    
    if (allFeeds.length > 0) {
      // 找出新增的 feeds（不在 Map 中的）
      const newFeeds: FeedSection[] = [];
      
      for (const feed of allFeeds) {
        const key = getFeedKey(feed);
        if (!seenFeedsMap.has(key)) {
          newFeeds.push(feed);
          seenFeedsMap.set(key, feed);
        }
      }
      
      if (newFeeds.length > 0) {
        const message: FeedsUpdatedMessage = {
          action: 'feedsUpdated',
          data: {
            newFeeds,
            totalCount: seenFeedsMap.size - 1, // 减去 __current_url__ 这个特殊项
            timestamp: new Date().toISOString(),
            url: window.location.href,
          },
        };
        
        // 发送消息到 background/popup
        chrome.runtime.sendMessage(message).catch((error) => {
          console.warn('[Content Script] 发送自动更新消息失败（可能 popup 未打开）:', error);
        });
        
        const reasonText = reason ? ` (${reason})` : '';
        console.log(`[Content Script] 发现 ${newFeeds.length} 条新笔记，已发送增量更新（总计 ${seenFeedsMap.size - 1} 条）${reasonText}`);
      } else {
        if (reason) {
          console.log(`[Content Script] ${reason}，未发现新笔记`);
        }
      }
    } else {
      if (reason) {
        console.log(`[Content Script] ${reason}，但未找到笔记数据，可能还在加载中...`);
      }
    }
  } catch (error) {
    console.error(`[Content Script] ${reason || '自动更新数据'}时出错:`, error);
  } finally {
    // 释放锁（延迟释放，避免频繁触发）
    setTimeout(() => {
      isCheckingFeeds = false;
    }, 200);
  }
}

function watchFeedUpdates() {
  // 如果已有观察者，先断开
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
  }
  
  // 移除之前的滚动监听器（如果存在）
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true);
    scrollHandler = null;
  }
  
  // 清除滚动定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer);
    scrollTimer = null;
  }
  
  // 检查是否是搜索结果页
  const searchContainer = document.querySelector('.feeds-container');
  // 检查是否是个人主页
  const profileContainer = document.querySelector('#userPostedFeeds');
  
  const container = searchContainer || profileContainer;
  const context = searchContainer ? 'search' : 'user';
  
  if (!container) {
    console.log('[Content Script] 未找到容器元素，等待页面加载...');
    // 如果容器不存在，等待一段时间后重试
    setTimeout(() => {
      watchFeedUpdates();
    }, 1000);
    return;
  }
  
  // URL 变化时清空已见过的 feeds Map（新页面）
  const currentUrl = window.location.href;
  if (!seenFeedsMap.has('__current_url__') || seenFeedsMap.get('__current_url__')?.link !== currentUrl) {
    seenFeedsMap.clear();
    seenFeedsMap.set('__current_url__', { index: -1, link: currentUrl } as FeedSection);
    console.log('[Content Script] 检测到新页面，清空已见过的 feeds Map');
  }
  
  console.log(`[Content Script] 开始监听 ${context === 'search' ? '搜索结果页' : '个人主页'} DOM 变化...`);
  
  const observer = new MutationObserver(() => {
    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // 设置新的防抖定时器
    debounceTimer = setTimeout(() => {
      console.log('[Content Script] 检测到 DOM 变化，自动更新数据...');
      checkAndUpdateFeeds(container, context, 'DOM 变化');
    }, DEBOUNCE_DELAY);
  });
  
  // 保存当前观察者
  currentObserver = observer;
  
  // 开始监听 DOM 变化
  observer.observe(container, {
    childList: true, // 监听子节点的添加和删除
    subtree: true,   // 监听所有后代节点
  });
  
  // 如果是搜索结果页，添加滚动监听（滚动加载更多内容）
  if (context === 'search') {
    // 移除之前的滚动监听器（如果存在）
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
      scrollHandler = null;
    }
    
    // 创建新的滚动监听器
    scrollHandler = () => {
      // 清除之前的滚动定时器
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      
      // 检查是否接近页面底部
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceToBottom = documentHeight - (scrollTop + windowHeight);
      
      // 如果距离底部小于阈值，触发更新
      if (distanceToBottom < SCROLL_THRESHOLD) {
        scrollTimer = setTimeout(() => {
          console.log('[Content Script] 检测到滚动到底部附近，主动更新数据...');
          checkAndUpdateFeeds(container, context, '滚动到底部');
        }, SCROLL_DEBOUNCE_DELAY);
      }
    };
    
    // 添加滚动监听（使用捕获阶段，确保能捕获到所有滚动事件）
    window.addEventListener('scroll', scrollHandler, true);
    console.log('[Content Script] 已启用滚动监听（搜索结果页）');
  }
  
  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler, true);
    }
  });
  
  // 初始解析一次
  checkAndUpdateFeeds(container, context, '初始解析');
}

// 页面加载完成后开始监听
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    watchFeedUpdates();
  });
} else {
  // 如果页面已经加载完成，直接开始监听
  watchFeedUpdates();
}

// 监听 URL 变化（SPA 路由切换时重新初始化）
let lastUrl = window.location.href;

// 监听 popstate 事件（浏览器前进/后退）
window.addEventListener('popstate', () => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('[Content Script] 检测到 URL 变化（popstate），重新初始化监听器...');
    setTimeout(() => {
      watchFeedUpdates();
    }, 500);
  }
});

// 拦截 pushState 和 replaceState（SPA 路由切换）
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('[Content Script] 检测到 URL 变化（pushState），重新初始化监听器...');
    setTimeout(() => {
      watchFeedUpdates();
    }, 500);
  }
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('[Content Script] 检测到 URL 变化（replaceState），重新初始化监听器...');
    setTimeout(() => {
      watchFeedUpdates();
    }, 500);
  }
};

// 清理资源
window.addEventListener('beforeunload', () => {
  if (currentObserver) {
    currentObserver.disconnect();
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (scrollTimer) {
    clearTimeout(scrollTimer);
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true);
  }
});

// 监听来自 popup 或 background 的消息
chrome.runtime.onMessage.addListener((
  request: ContentMessageRequest | { action: 'ping' },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse | { success: boolean }) => void
) => {
  console.log('[Content Script] 收到消息:', request.action);
  
  // 响应 ping 消息，用于检查 content script 是否已注入
  if (request.action === 'ping') {
    console.log('[Content Script] 响应 ping');
    sendResponse({ success: true });
    return true;
  }
  
  // 处理获取搜索结果页面的笔记数据
  if (request.action === 'getSearchResultFeeds') {
    return handleGetSearchResultFeeds(sendResponse as (response: FeedsResponse) => void);
  }
  
  // 处理获取个人主页的笔记数据
  if (request.action === 'getUserPostedFeeds') {
    return handleGetUserPostedFeeds(sendResponse as (response: FeedsResponse) => void);
  }
  
  // 处理未知的 action
  console.warn('[Content Script] 收到未知的 action:', request.action);
  sendResponse({
    success: false,
    error: `未知的 action: ${(request as { action: string }).action}`,
  });
  return true;
});
