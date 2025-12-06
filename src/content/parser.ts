// 笔记数据解析器
import type { FeedSection } from './types';

/**
 * 从链接中提取 noteId
 * 支持多种格式：/search_result/noteId, /explore/noteId, /user/profile/xxx/noteId
 */
function extractNoteId(link: string): string | undefined {
  // 优先匹配 24 位十六进制（标准格式）
  const exactMatch = link.match(/\/([a-f0-9]{24})(?:\?|$|&)/i);
  if (exactMatch) {
    return exactMatch[1];
  }
  
  // 尝试更宽松的匹配（至少 20 位）
  const looseMatch = link.match(/\/([a-f0-9]{20,})(?:\?|$|&)/i);
  if (looseMatch) {
    return looseMatch[1];
  }
  
  return undefined;
}

/**
 * 从 section 元素中提取链接和 noteId
 */
function extractLink(section: HTMLElement): { link?: string; noteId?: string } {
  // 优先查找 cover.mask.ld 类的链接
  const linkElement = section.querySelector('a.cover.mask.ld') as HTMLAnchorElement;
  if (linkElement) {
    const href = linkElement.getAttribute('href') || linkElement.href;
    if (href) {
      try {
        const absoluteUrl = new URL(href, window.location.origin).href;
        const noteId = extractNoteId(absoluteUrl);
        return { link: absoluteUrl, noteId };
      } catch {
        const fallbackLink = linkElement.href || href;
        const noteId = extractNoteId(fallbackLink);
        return { link: fallbackLink, noteId };
      }
    }
  }
  
  // 如果没有找到，尝试查找其他链接
  const altLinkElement = section.querySelector(
    'a[href*="/explore/"], a[href*="/search_result/"], a[href*="/user/profile/"]'
  ) as HTMLAnchorElement;
  if (altLinkElement) {
    const href = altLinkElement.getAttribute('href') || altLinkElement.href;
    if (href) {
      try {
        const absoluteUrl = new URL(href, window.location.origin).href;
        const noteId = extractNoteId(absoluteUrl);
        return { link: absoluteUrl, noteId };
      } catch {
        const fallbackLink = altLinkElement.href || href;
        const noteId = extractNoteId(fallbackLink);
        return { link: fallbackLink, noteId };
      }
    }
  }
  
  return {};
}

/**
 * 从 section 元素中提取封面图片
 */
function extractCoverImage(section: HTMLElement): string | undefined {
  // 优先查找 cover 内的图片
  const coverImgElement = section.querySelector(
    'a.cover.mask.ld img[data-xhs-img], a.cover img[data-xhs-img]'
  ) as HTMLImageElement;
  if (coverImgElement?.src) {
    return coverImgElement.src;
  }
  
  // 如果没有找到，尝试查找任何带 data-xhs-img 的图片
  const imgElement = section.querySelector('img[data-xhs-img]') as HTMLImageElement;
  if (imgElement?.src) {
    return imgElement.src;
  }
  
  return undefined;
}

/**
 * 从 section 元素中提取标题
 */
function extractTitle(section: HTMLElement): string | undefined {
  // 优先查找 .title 内的 span
  const titleSpanElement = section.querySelector('.title span');
  if (titleSpanElement) {
    return titleSpanElement.textContent?.trim() || undefined;
  }
  
  // 如果没有找到，直接查找 .title
  const titleElement = section.querySelector('.title');
  if (titleElement) {
    return titleElement.textContent?.trim() || undefined;
  }
  
  return undefined;
}

/**
 * 从 section 元素中提取作者信息
 */
function extractAuthor(section: HTMLElement): {
  authorName?: string;
  authorAvatar?: string;
  authorLink?: string;
} {
  const authorElement = section.querySelector('.author') as HTMLAnchorElement;
  if (!authorElement) {
    return {};
  }
  
  const result: {
    authorName?: string;
    authorAvatar?: string;
    authorLink?: string;
  } = {
    authorLink: authorElement.href || undefined,
  };
  
  const authorNameElement = authorElement.querySelector('.name');
  if (authorNameElement) {
    result.authorName = authorNameElement.textContent?.trim() || undefined;
  }
  
  const authorAvatarElement = authorElement.querySelector('img.author-avatar') as HTMLImageElement;
  if (authorAvatarElement?.src) {
    result.authorAvatar = authorAvatarElement.src;
  }
  
  return result;
}

/**
 * 从 section 元素中提取点赞数
 */
function extractLikeCount(section: HTMLElement): string | undefined {
  const likeCountElement = section.querySelector('.like-wrapper .count');
  if (likeCountElement) {
    return likeCountElement.textContent?.trim() || undefined;
  }
  return undefined;
}

/**
 * 从单个 section 元素中解析所有笔记数据
 */
export function parseFeedSection(section: HTMLElement, index: number): FeedSection {
  const feed: FeedSection = { index };
  
  // 获取 data-width 和 data-height
  feed.dataWidth = section.getAttribute('data-width') || undefined;
  feed.dataHeight = section.getAttribute('data-height') || undefined;
  
  // 提取链接和 noteId
  const { link, noteId } = extractLink(section);
  feed.link = link;
  feed.noteId = noteId;
  
  // 提取封面图片
  feed.coverImage = extractCoverImage(section);
  
  // 提取标题
  feed.title = extractTitle(section);
  
  // 提取作者信息
  const author = extractAuthor(section);
  feed.authorName = author.authorName;
  feed.authorAvatar = author.authorAvatar;
  feed.authorLink = author.authorLink;
  
  // 提取点赞数
  feed.likeCount = extractLikeCount(section);
  
  return feed;
}

/**
 * 从容器元素中解析所有笔记数据
 */
export function parseFeedsFromContainer(
  container: Element,
  context: 'search' | 'user' = 'search'
): FeedSection[] {
  const sections = Array.from(container.querySelectorAll('section.note-item'));
  
  if (sections.length === 0) {
    return [];
  }
  
  const logPrefix = context === 'search' ? '[搜索页面]' : '[个人主页]';
  console.log(`${logPrefix} 找到 ${sections.length} 个笔记 section`);
  
  const feeds = sections.map((section, index) => {
    const feed = parseFeedSection(section as HTMLElement, index);
    
    // 调试日志（仅在前3个元素时输出）
    if (index < 3) {
      console.log(`${logPrefix} 提取第 ${index} 个笔记:`, {
        noteId: feed.noteId,
        title: feed.title?.substring(0, 20) + (feed.title && feed.title.length > 20 ? '...' : ''),
        author: feed.authorName,
        likeCount: feed.likeCount,
        hasLink: !!feed.link,
        hasCoverImage: !!feed.coverImage,
        link: feed.link?.substring(0, 50) + (feed.link && feed.link.length > 50 ? '...' : ''),
      });
    }
    
    return feed;
  });
  
  console.log(`${logPrefix} 成功提取 ${feeds.length} 个笔记数据`);
  
  return feeds;
}

