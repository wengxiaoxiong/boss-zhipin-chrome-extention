// Background Service Worker - 处理 Chrome 存储
console.log('Background service worker loaded')

interface MessageRequest {
  action: 'saveData' | 'getData' | 'getAllData' | 'clearData'
  key?: string
  value?: any
}

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((
  request: MessageRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) => {
  if (request.action === 'saveData') {
    const { key, value } = request
    
    if (!key) {
      sendResponse({ success: false, error: 'Key is required' })
      return true
    }
    
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        console.log('Data saved:', key)
        sendResponse({ success: true })
      }
    })
    return true
  }

  if (request.action === 'getData') {
    const { key } = request
    
    if (!key) {
      sendResponse({ success: false, error: 'Key is required' })
      return true
    }
    
    chrome.storage.local.get([key], (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ success: true, data: result[key] })
      }
    })
    return true
  }

  if (request.action === 'getAllData') {
    chrome.storage.local.get(null, (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ success: true, data: result })
      }
    })
    return true
  }

  if (request.action === 'clearData') {
    const { key } = request
    
    if (key) {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else {
          sendResponse({ success: true })
        }
      })
    } else {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else {
          sendResponse({ success: true })
        }
      })
    }
    return true
  }
})

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('Extension installed/updated:', details.reason)
  
  // 初始化默认数据
  chrome.storage.local.set({
    installedAt: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
  })
})
