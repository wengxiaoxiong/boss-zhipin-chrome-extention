// Content Script - 获取当前页面的 DOM
console.log('Content script loaded');

interface ContentMessageRequest {
  action: 'getDOM' | 'getElementInfo';
  selector?: string;
}

// 监听来自 popup 或 background 的消息
chrome.runtime.onMessage.addListener((
  request: ContentMessageRequest | { action: 'ping' },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) => {
  // 响应 ping 消息，用于检查 content script 是否已注入
  if (request.action === 'ping') {
    sendResponse({ success: true })
    return true
  }

  if (request.action === 'getDOM') {
    try {
      // 获取页面 DOM 信息
      const domData = {
        title: document.title,
        url: window.location.href,
        html: document.documentElement.outerHTML,
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll('a')).map(link => ({
          href: link.href,
          text: link.textContent?.trim() || '',
        })),
        images: Array.from(document.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt,
        })),
        timestamp: new Date().toISOString(),
      };

      sendResponse({ success: true, data: domData });
    } catch (error) {
      console.error('Error getting DOM:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true; // 保持消息通道开放以支持异步响应
  }

  if (request.action === 'getElementInfo') {
    try {
      const selector = request.selector;
      if (!selector) {
        sendResponse({ success: false, error: 'Selector is required' });
        return true;
      }
      const element = document.querySelector(selector);
      
      if (!element) {
        sendResponse({ success: false, error: 'Element not found' });
        return true;
      }

      const elementInfo = {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.trim() || '',
        innerHTML: element.innerHTML,
        attributes: Array.from(element.attributes).reduce((acc: Record<string, string>, attr: Attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {} as Record<string, string>),
        boundingRect: element.getBoundingClientRect(),
      };

      sendResponse({ success: true, data: elementInfo });
    } catch (error) {
      console.error('Error getting element info:', error);
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }
});

// 页面加载完成后自动获取 DOM 信息（可选）
window.addEventListener('load', () => {
  console.log('Page loaded, DOM ready');
});

