// Background Service Worker - 处理 Chrome 存储
console.log('Background service worker loaded');

interface MessageRequest {
  action: 'saveData' | 'getData' | 'getAllData' | 'clearData' | 'getHistory' | 'deleteHistory';
  key?: string;
  value?: any;
  keys?: string[]; // 用于批量删除
}

// 小红书页面 URL 匹配模式
const XHS_PROFILE_PATTERN = /^https:\/\/www\.xiaohongshu\.com\/user\/profile\/[^/]+/;
const XHS_SEARCH_PATTERN = /^https:\/\/www\.xiaohongshu\.com\/search_result/;

/**
 * 检查 URL 是否是小红书支持的页面
 */
function isXHSSupportedPage(url: string | undefined): { isProfile: boolean; isSearch: boolean } {
  if (!url) {
    return { isProfile: false, isSearch: false };
  }
  
  const isProfile = XHS_PROFILE_PATTERN.test(url);
  const isSearch = XHS_SEARCH_PATTERN.test(url);
  
  return { isProfile, isSearch };
}

/**
 * 等待 content script 准备就绪
 */
async function waitForContentScript(tabId: number, maxAttempts = 10): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      console.log(`[BG] Content script 已就绪 (尝试 ${attempt + 1}/${maxAttempts})`);
      return true;
    } catch (error) {
      if (attempt < maxAttempts - 1) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  return false;
}

/**
 * 自动触发采集
 */
async function triggerAutoCollection(tabId: number, url: string, action: 'getUserPostedFeeds' | 'getSearchResultFeeds') {
  try {
    console.log(`[BG] 准备自动采集: ${action}, URL: ${url}`);
    
    // 等待 content script 准备就绪
    const isReady = await waitForContentScript(tabId);
    if (!isReady) {
      console.warn(`[BG] Content script 未就绪，跳过自动采集`);
      return;
    }
    
    // 等待页面 DOM 加载（给页面一些时间渲染）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 发送采集消息
    const response = await chrome.tabs.sendMessage(tabId, { action }) as {
      success: boolean;
      data?: any;
      error?: string;
    };
    
    if (response && response.success && response.data) {
      console.log(`[BG] 自动采集成功:`, {
        action,
        url,
        count: response.data.count || 0,
        timestamp: response.data.timestamp,
      });
      
      // 存储采集结果
      const storageKey = action === 'getUserPostedFeeds' 
        ? `auto_collected_user_${Date.now()}` 
        : `auto_collected_search_${Date.now()}`;
      
      chrome.storage.local.set({
        [storageKey]: {
          ...response.data,
          collectedAt: new Date().toISOString(),
          action,
        },
        // 同时保存最新的采集结果
        lastXHSData: response.data,
        lastXHSCollectionTime: new Date().toISOString(),
        lastXHSCollectionAction: action,
        lastXHSCollectionURL: url,
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[BG] 存储采集结果失败:', chrome.runtime.lastError);
        } else {
          console.log(`[BG] 采集结果已存储: ${storageKey}`);
        }
      });
    } else {
      console.warn(`[BG] 自动采集失败:`, response?.error || '未知错误');
    }
  } catch (error) {
    console.error(`[BG] 自动采集异常:`, error);
  }
}

// 用于跟踪已处理的 URL，避免重复触发
const processedUrls = new Map<number, string>();

/**
 * 处理 tab 更新事件
 */
async function handleTabUpdate(tabId: number, changeInfo: { status?: string; url?: string }, tab: chrome.tabs.Tab) {
  // 只处理 URL 变化或页面加载完成的情况
  if (!changeInfo.url && changeInfo.status !== 'complete') {
    return;
  }
  
  const url = changeInfo.url || tab.url;
  if (!url) {
    return;
  }
  
  // 检查是否是小红书支持的页面
  const { isProfile, isSearch } = isXHSSupportedPage(url);
  
  if (!isProfile && !isSearch) {
    // 如果不是支持的页面，清除已处理的 URL 记录
    processedUrls.delete(tabId);
    return;
  }
  
  // 检查是否已经处理过这个 URL（避免重复触发）
  const lastProcessedUrl = processedUrls.get(tabId);
  if (lastProcessedUrl === url) {
    return;
  }
  
  // 标记为已处理
  processedUrls.set(tabId, url);
  
  // 确定采集动作
  const action = isProfile ? 'getUserPostedFeeds' : 'getSearchResultFeeds';
  
  console.log(`[BG] 检测到小红书页面，准备自动采集:`, {
    tabId,
    url,
    action,
    status: changeInfo.status,
  });
  
  // 如果页面还在加载，等待加载完成
  if (changeInfo.status !== 'complete') {
    // 等待页面加载完成后再触发
    const checkComplete = setInterval(async () => {
      try {
        const currentTab = await chrome.tabs.get(tabId);
        if (currentTab.status === 'complete') {
          clearInterval(checkComplete);
          await triggerAutoCollection(tabId, url, action);
        }
      } catch (error) {
        clearInterval(checkComplete);
        console.error('[BG] 检查页面状态失败:', error);
      }
    }, 500);
    
    // 设置超时，避免无限等待
    setTimeout(() => {
      clearInterval(checkComplete);
    }, 10000);
  } else {
    // 页面已加载完成，直接触发
    await triggerAutoCollection(tabId, url, action);
  }
}

// 监听 tab 更新事件（包括 URL 变化和页面加载完成）
chrome.tabs.onUpdated.addListener(handleTabUpdate);

// 监听 tab 移除事件，清理已处理的 URL 记录
chrome.tabs.onRemoved.addListener((tabId) => {
  processedUrls.delete(tabId);
});

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((
  request: MessageRequest | { action: 'feedsUpdated'; data: any },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) => {
  // 处理来自 content script 的自动更新消息（增量更新）
  if (request.action === 'feedsUpdated') {
    const { data } = request;
    if (data && data.newFeeds && data.newFeeds.length > 0) {
      console.log('[BG] 收到自动更新消息:', {
        newFeedsCount: data.newFeeds.length,
        totalCount: data.totalCount,
        url: data.url,
      });
      
      // 存储增量更新数据
      const updateKey = `auto_update_${Date.now()}`;
      chrome.storage.local.set({
        [updateKey]: {
          ...data,
          updatedAt: new Date().toISOString(),
        },
        // 更新最新的数据
        lastXHSUpdate: data,
        lastXHSUpdateTime: new Date().toISOString(),
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[BG] 存储自动更新失败:', chrome.runtime.lastError);
        } else {
          console.log(`[BG] 自动更新已存储: ${updateKey}`);
        }
      });
    }
    // 不需要响应，因为这是单向通知
    return false;
  }
  
  if (request.action === 'saveData') {
    const { key, value } = request;
    
    if (!key) {
      sendResponse({ success: false, error: 'Key is required' });
      return true;
    }
    
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('Data saved:', key);
        sendResponse({ success: true });
      }
    });
    return true; // 保持消息通道开放
  }

  if (request.action === 'getData') {
    const { key } = request;
    
    if (!key) {
      sendResponse({ success: false, error: 'Key is required' });
      return true;
    }
    
    chrome.storage.local.get([key], (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, data: result[key] });
      }
    });
    return true;
  }

  if (request.action === 'getAllData') {
    chrome.storage.local.get(null, (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, data: result });
      }
    });
    return true;
  }

  if (request.action === 'clearData') {
    const { key } = request;
    
    if (key) {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
    } else {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true });
        }
      });
    }
    return true;
  }

  if (request.action === 'getHistory') {
    chrome.storage.local.get(null, (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        // 筛选出历史记录（auto_collected_ 和 auto_update_ 开头的键）
        const history: Array<{ key: string; data: any; type: 'collection' | 'update' }> = [];
        
        for (const [key, value] of Object.entries(result)) {
          if (key.startsWith('auto_collected_')) {
            history.push({
              key,
              data: value,
              type: 'collection',
            });
          } else if (key.startsWith('auto_update_')) {
            history.push({
              key,
              data: value,
              type: 'update',
            });
          }
        }
        
        // 按时间戳排序（最新的在前）
        history.sort((a, b) => {
          const timeA = a.data.collectedAt || a.data.updatedAt || '';
          const timeB = b.data.collectedAt || b.data.updatedAt || '';
          return timeB.localeCompare(timeA);
        });
        
        sendResponse({ success: true, data: history });
      }
    });
    return true;
  }

  if (request.action === 'deleteHistory') {
    const { keys } = request;
    
    if (!keys || keys.length === 0) {
      sendResponse({ success: false, error: 'Keys are required' });
      return true;
    }
    
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('History deleted:', keys);
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('Extension installed/updated:', details.reason);
  
  // 初始化默认数据
  chrome.storage.local.set({
    installedAt: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
  });
});

