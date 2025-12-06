// 笔记数据解析器
import type { FeedSection, UserInfo } from './types';

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

/**
 * 从页面中解析用户信息（user-info）
 */
export function parseUserInfo(): UserInfo | undefined {
  const userInfoElement = document.querySelector('.user-info');
  
  if (!userInfoElement) {
    console.log('[用户信息] 未找到 .user-info 元素');
    return undefined;
  }
  
  const userInfo: UserInfo = {};
  
  // 提取用户名
  const userNameElement = userInfoElement.querySelector('.user-nickname .user-name');
  if (userNameElement) {
    userInfo.nickname = userNameElement.textContent?.trim() || undefined;
  }
  
  // 提取小红书号
  const redIdElement = userInfoElement.querySelector('.user-redId');
  if (redIdElement) {
    const redIdText = redIdElement.textContent?.trim() || '';
    // 提取 "小红书号：6972779965" 中的数字部分
    const redIdMatch = redIdText.match(/小红书号[：:]\s*(\S+)/);
    if (redIdMatch) {
      userInfo.redId = redIdMatch[1];
    } else {
      // 如果没有匹配到，尝试直接提取数字
      const numberMatch = redIdText.match(/(\d+)/);
      if (numberMatch) {
        userInfo.redId = numberMatch[1];
      }
    }
  }
  
  // 提取头像（优先查找 .user-info .avatar img.user-image，如果没有则查找任何 .avatar img）
  const avatarImg = userInfoElement.querySelector('.avatar img.user-image') as HTMLImageElement || 
                    userInfoElement.querySelector('.avatar img') as HTMLImageElement;
  if (avatarImg?.src) {
    userInfo.avatar = avatarImg.src;
  }
  
  // 提取用户描述
  const descElement = userInfoElement.querySelector('.user-desc');
  if (descElement) {
    userInfo.description = descElement.textContent?.trim() || undefined;
  }
  
  // 提取标签
  const tagItems = Array.from(userInfoElement.querySelectorAll('.user-tags .tag-item'));
  const tags: string[] = [];
  tagItems.forEach((tagItem) => {
    // 检查是否是性别标签
    const genderElement = tagItem.querySelector('.gender');
    if (genderElement) {
      const svgUse = genderElement.querySelector('use');
      if (svgUse) {
        const href = svgUse.getAttribute('xlink:href') || svgUse.getAttribute('href');
        if (href === '#male') {
          userInfo.gender = 'male';
        } else if (href === '#female') {
          userInfo.gender = 'female';
        }
      }
    } else {
      // 其他标签（地区、职业等）
      const tagText = tagItem.textContent?.trim();
      if (tagText) {
        // 检查是否是地区信息（包含省、市、区、县，或者是常见地区名称）
        const locationKeywords = ['省', '市', '区', '县', '自治区', '特别行政区'];
        const isLocation = locationKeywords.some(keyword => tagText.includes(keyword)) ||
                          // 常见省份/城市名称模式（如：广东深圳、北京、上海等）
                          /^[^省市区县]+(?:省|市|区|县|自治区|特别行政区)?[^省市区县]*(?:省|市|区|县|自治区|特别行政区)?$/.test(tagText);
        
        if (isLocation && !userInfo.location) {
          // 如果还没有设置 location，则设置为这个标签
          userInfo.location = tagText;
        } else if (!isLocation) {
          // 非地区标签，添加到 tags 数组
          tags.push(tagText);
        }
      }
    }
  });
  
  if (tags.length > 0) {
    userInfo.tags = tags;
  }
  
  // 提取互动数据（关注、粉丝、获赞与收藏）
  const interactionItems = Array.from(userInfoElement.querySelectorAll('.user-interactions > div'));
  interactionItems.forEach((item) => {
    const countElement = item.querySelector('.count');
    const showsElement = item.querySelector('.shows');
    
    if (countElement && showsElement) {
      const count = countElement.textContent?.trim() || '';
      const label = showsElement.textContent?.trim() || '';
      
      if (label.includes('关注')) {
        userInfo.followingCount = count;
      } else if (label.includes('粉丝')) {
        userInfo.followersCount = count;
      } else if (label.includes('获赞') || label.includes('收藏')) {
        userInfo.likesAndCollectionsCount = count;
      }
    }
  });
  
  console.log('[用户信息] 成功提取用户信息:', {
    nickname: userInfo.nickname,
    redId: userInfo.redId,
    hasAvatar: !!userInfo.avatar,
    hasDescription: !!userInfo.description,
    tagsCount: userInfo.tags?.length || 0,
    gender: userInfo.gender,
    location: userInfo.location,
  });
  
  return userInfo;
}

