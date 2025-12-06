// Content Script - 获取小红书个人主页数据
console.log('Content script loaded');

interface ContentMessageRequest {
  action: 'getUserPostedFeeds' | 'getSearchResultFeeds';
}

interface FeedSection {
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

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
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
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'getSearchResultFeeds') {
    console.log('[Content Script] 开始处理 getSearchResultFeeds');
    try {
      const feedsContainer = document.querySelector('.feeds-container');
      
      if (!feedsContainer) {
        console.log('[Content Script] 未找到 #feeds-container 元素，请确保当前页面是小红书搜索结果页');
        sendResponse({ success: false, error: '未找到 #feeds-container 元素，请确保当前页面是小红书搜索结果页' });
        return true;
      }

      const sections = Array.from(feedsContainer.querySelectorAll('section.note-item'));
      
      if (sections.length === 0) {
        sendResponse({ success: false, error: '未找到任何笔记 section，可能页面还未加载完成' });
        return true;
      }

      console.log(`[搜索页面] 找到 ${sections.length} 个笔记 section`);

      const feeds: FeedSection[] = sections.map((section, index) => {
        const feed: FeedSection = { index };

        // 获取 data-width 和 data-height
        feed.dataWidth = section.getAttribute('data-width') || undefined;
        feed.dataHeight = section.getAttribute('data-height') || undefined;

        // 获取链接 - 优先查找 cover.mask.ld 类的链接
        const linkElement = section.querySelector('a.cover.mask.ld') as HTMLAnchorElement;
        if (linkElement) {
          // 使用 href 属性（浏览器会自动转换为绝对路径）
          const href = linkElement.getAttribute('href') || linkElement.href;
          if (href) {
            // 如果是相对路径，转换为绝对路径
            try {
              feed.link = new URL(href, window.location.origin).href;
            } catch {
              feed.link = linkElement.href || href;
            }
            
            // 从链接中提取 noteId（支持 /search_result/noteId 或 /explore/noteId 格式）
            // noteId 通常是 24 位十六进制字符串，但也可能是其他格式
            const noteIdMatch = feed.link.match(/\/([a-f0-9]{24})(?:\?|$|&)/i);
            if (noteIdMatch) {
              feed.noteId = noteIdMatch[1];
            } else {
              // 尝试更宽松的匹配（至少 20 位）
              const looseMatch = feed.link.match(/\/([a-f0-9]{20,})(?:\?|$|&)/i);
              if (looseMatch) {
                feed.noteId = looseMatch[1];
              }
            }
          }
        }
        
        // 如果还没有找到链接，尝试查找其他链接
        if (!feed.link) {
          const altLinkElement = section.querySelector('a[href*="/explore/"], a[href*="/search_result/"]') as HTMLAnchorElement;
          if (altLinkElement) {
            const href = altLinkElement.getAttribute('href') || altLinkElement.href;
            if (href) {
              try {
                feed.link = new URL(href, window.location.origin).href;
              } catch {
                feed.link = altLinkElement.href || href;
              }
              
              // 提取 noteId
              if (!feed.noteId) {
                const noteIdMatch = feed.link.match(/\/([a-f0-9]{24})(?:\?|$|&)/i);
                if (noteIdMatch) {
                  feed.noteId = noteIdMatch[1];
                } else {
                  const looseMatch = feed.link.match(/\/([a-f0-9]{20,})(?:\?|$|&)/i);
                  if (looseMatch) {
                    feed.noteId = looseMatch[1];
                  }
                }
              }
            }
          }
        }

        // 获取封面图片 - 查找 cover 内的图片
        const coverImgElement = section.querySelector('a.cover.mask.ld img[data-xhs-img], a.cover img[data-xhs-img]') as HTMLImageElement;
        if (coverImgElement && coverImgElement.src) {
          feed.coverImage = coverImgElement.src;
        } else {
          // 如果没有找到，尝试查找任何带 data-xhs-img 的图片
          const imgElement = section.querySelector('img[data-xhs-img]') as HTMLImageElement;
          if (imgElement && imgElement.src) {
            feed.coverImage = imgElement.src;
          }
        }

        // 获取标题 - 查找 .title 内的 span 或直接查找 .title
        const titleSpanElement = section.querySelector('.title span');
        if (titleSpanElement) {
          feed.title = titleSpanElement.textContent?.trim() || undefined;
        } else {
          const titleElement = section.querySelector('.title');
          if (titleElement) {
            feed.title = titleElement.textContent?.trim() || undefined;
          }
        }

        // 获取作者信息
        const authorElement = section.querySelector('.author') as HTMLAnchorElement;
        if (authorElement) {
          feed.authorLink = authorElement.href || undefined;
          const authorNameElement = authorElement.querySelector('.name');
          if (authorNameElement) {
            feed.authorName = authorNameElement.textContent?.trim() || undefined;
          }
          const authorAvatarElement = authorElement.querySelector('img.author-avatar') as HTMLImageElement;
          if (authorAvatarElement && authorAvatarElement.src) {
            feed.authorAvatar = authorAvatarElement.src;
          }
        }

        // 获取点赞数
        const likeCountElement = section.querySelector('.like-wrapper .count');
        if (likeCountElement) {
          feed.likeCount = likeCountElement.textContent?.trim() || undefined;
        }

        // 调试日志（仅在前3个元素时输出）
        if (index < 3) {
          console.log(`[搜索页面] 提取第 ${index} 个笔记:`, {
            noteId: feed.noteId,
            title: feed.title?.substring(0, 20) + (feed.title && feed.title.length > 20 ? '...' : ''),
            author: feed.authorName,
            likeCount: feed.likeCount,
            hasLink: !!feed.link,
            hasCoverImage: !!feed.coverImage,
            link: feed.link?.substring(0, 50) + (feed.link && feed.link.length > 50 ? '...' : '')
          });
        }

        return feed;
      });

      console.log(`[搜索页面] 成功提取 ${feeds.length} 个笔记数据`);

      const response = { 
        success: true, 
        data: {
          feeds,
          count: feeds.length,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }
      };
      console.log('[Content Script] 准备发送响应:', response);
      sendResponse(response);
      console.log('[Content Script] 响应已发送');
    } catch (error) {
      console.error('[Content Script] Error getting search result feeds:', error);
      const errorResponse = { success: false, error: String(error) };
      console.log('[Content Script] 准备发送错误响应:', errorResponse);
      sendResponse(errorResponse);
      console.log('[Content Script] 错误响应已发送');
    }
    return true;
  }

  if (request.action === 'getUserPostedFeeds') {
    console.log('[Content Script] 开始处理 getUserPostedFeeds');
    try {
      const userPostedFeeds = document.querySelector('#userPostedFeeds');
      
      if (!userPostedFeeds) {
        sendResponse({ success: false, error: '未找到 #userPostedFeeds 元素，请确保当前页面是小红书个人主页' });
        return true;
      }

      const sections = Array.from(userPostedFeeds.querySelectorAll('section.note-item'));
      
      if (sections.length === 0) {
        sendResponse({ success: false, error: '未找到任何笔记 section，可能页面还未加载完成' });
        return true;
      }

      const feeds: FeedSection[] = sections.map((section, index) => {
        const feed: FeedSection = { index };

        // 获取 data-width 和 data-height
        feed.dataWidth = section.getAttribute('data-width') || undefined;
        feed.dataHeight = section.getAttribute('data-height') || undefined;

        // 获取链接 - 优先查找 cover.mask.ld 类的链接
        const linkElement = section.querySelector('a.cover.mask.ld') as HTMLAnchorElement;
        if (linkElement && linkElement.href) {
          feed.link = linkElement.href;
          // 从链接中提取 noteId（格式：/user/profile/xxx/noteId）
          const noteIdMatch = feed.link.match(/\/([a-f0-9]{24})(?:\?|$)/);
          if (noteIdMatch) {
            feed.noteId = noteIdMatch[1];
          }
        } else {
          // 如果没有找到，尝试查找其他链接
          const altLinkElement = section.querySelector('a[href*="/explore/"], a[href*="/user/profile/"]') as HTMLAnchorElement;
          if (altLinkElement && altLinkElement.href) {
            feed.link = altLinkElement.href;
            const noteIdMatch = feed.link.match(/\/([a-f0-9]{24})(?:\?|$)/);
            if (noteIdMatch) {
              feed.noteId = noteIdMatch[1];
            }
          }
        }

        // 获取封面图片 - 查找 cover 内的图片
        const coverImgElement = section.querySelector('a.cover.mask.ld img[data-xhs-img], a.cover img[data-xhs-img]') as HTMLImageElement;
        if (coverImgElement && coverImgElement.src) {
          feed.coverImage = coverImgElement.src;
        } else {
          // 如果没有找到，尝试查找任何带 data-xhs-img 的图片
          const imgElement = section.querySelector('img[data-xhs-img]') as HTMLImageElement;
          if (imgElement && imgElement.src) {
            feed.coverImage = imgElement.src;
          }
        }

        // 获取标题 - 查找 .title 内的 span 或直接查找 .title
        const titleSpanElement = section.querySelector('.title span');
        if (titleSpanElement) {
          feed.title = titleSpanElement.textContent?.trim() || undefined;
        } else {
          const titleElement = section.querySelector('.title');
          if (titleElement) {
            feed.title = titleElement.textContent?.trim() || undefined;
          }
        }

        // 获取作者信息
        const authorElement = section.querySelector('.author') as HTMLAnchorElement;
        if (authorElement) {
          feed.authorLink = authorElement.href || undefined;
          const authorNameElement = authorElement.querySelector('.name');
          if (authorNameElement) {
            feed.authorName = authorNameElement.textContent?.trim() || undefined;
          }
          const authorAvatarElement = authorElement.querySelector('img.author-avatar') as HTMLImageElement;
          if (authorAvatarElement && authorAvatarElement.src) {
            feed.authorAvatar = authorAvatarElement.src;
          }
        }

        // 获取点赞数
        const likeCountElement = section.querySelector('.like-wrapper .count');
        if (likeCountElement) {
          feed.likeCount = likeCountElement.textContent?.trim() || undefined;
        }

        return feed;
      });

      sendResponse({ 
        success: true, 
        data: {
          feeds,
          count: feeds.length,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }
      });
    } catch (error) {
      console.error('Error getting user posted feeds:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }

  // 处理未知的 action
  console.warn('收到未知的 action:', request.action);
  sendResponse({ success: false, error: `未知的 action: ${request.action}` });
  return true;
});


