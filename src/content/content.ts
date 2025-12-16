// Content Script - 通用页面信息获取
console.log('Content script loaded')

interface MessageRequest {
  action: 'ping' | 'getPageInfo'
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

// 监听来自 popup 或 background 的消息
chrome.runtime.onMessage.addListener((
  request: MessageRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
) => {
  console.log('[Content Script] 收到消息:', request.action)
  
  // 响应 ping 消息，用于检查 content script 是否已注入
  if (request.action === 'ping') {
    console.log('[Content Script] 响应 ping')
    sendResponse({ success: true })
    return true
  }
  
  // 处理获取页面信息
  if (request.action === 'getPageInfo') {
    try {
      const pageInfo = {
        title: document.title,
        url: window.location.href,
      }
      
      sendResponse({
        success: true,
        data: pageInfo,
      })
    } catch (error) {
      console.error('[Content Script] 获取页面信息失败:', error)
      sendResponse({
        success: false,
        error: String(error),
      })
    }
    return true
  }
  
  // 处理未知的 action
  console.warn('[Content Script] 收到未知的 action:', request.action)
  sendResponse({
    success: false,
    error: `未知的 action: ${request.action}`,
  })
  return true
})
