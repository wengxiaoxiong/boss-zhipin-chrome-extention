/**
 * Content Script - 主入口文件
 * 支持 iframe 版本
 */

import { handleMessage } from './messageHandler'

console.log('[Content Script] ✅ 加载')
console.log('[Content Script] URL:', window.location.href)
console.log('[Content Script] 在 iframe 中:', window.self !== window.top)

// ==================== 消息监听 ====================

chrome.runtime.onMessage.addListener(handleMessage)
