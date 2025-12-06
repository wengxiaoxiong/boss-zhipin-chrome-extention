// Content Script - 获取小红书个人主页数据
import type {
  ContentMessageRequest,
  FeedsResponse,
  MessageResponse,
} from './types';
import { parseFeedsFromContainer } from './parser';

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
    
    const response: FeedsResponse = {
      success: true,
      data: {
        feeds,
        count: feeds.length,
        timestamp: new Date().toISOString(),
        url: window.location.href,
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
