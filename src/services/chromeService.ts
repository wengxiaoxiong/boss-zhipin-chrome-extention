// Chrome API 服务层
import type { MessageResponse, MessageAction, AutoGreetStatus } from '@/types'

/**
 * 获取当前活动标签页
 */
export async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab || null
}

/**
 * 向 content script 发送消息
 */
export async function sendMessageToTab<T = unknown>(
  tabId: number,
  action: MessageAction
): Promise<MessageResponse & { data?: T }> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action })
    return response as MessageResponse & { data?: T }
  } catch (error) {
    console.error(`[chromeService] 发送消息失败 (${action}):`, error)
    throw error
  }
}

/**
 * 检查并注入 content script
 */
export async function ensureContentScript(
  tabId: number,
  skipPing = false
): Promise<{ success: boolean; error?: string }> {
  console.log('[chromeService] 检查 content script, tabId:', tabId, 'skipPing:', skipPing)

  if (skipPing) {
    return { success: true }
  }

  // 尝试多次 ping
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`[chromeService] Ping 尝试 ${attempt + 1}/3`)
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      console.log('[chromeService] Ping 成功:', response)
      return { success: true }
    } catch (pingError) {
      console.log(`[chromeService] Ping 失败 (${attempt + 1}/3):`, pingError)

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        continue
      }

      // 所有 ping 尝试失败，尝试注入
      console.log('[chromeService] 尝试动态注入 content script...')

      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js'],
        })
        console.log('[chromeService] Content script 注入成功')

        await new Promise((resolve) => setTimeout(resolve, 500))

        // 注入后再次 ping
        try {
          const finalPing = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
          console.log('[chromeService] 注入后 ping 成功:', finalPing)
          return { success: true }
        } catch (finalPingError) {
          console.error('[chromeService] 注入后 ping 失败:', finalPingError)
          return {
            success: false,
            error: 'Content script 已注入但无法响应，可能是页面安全策略限制',
          }
        }
      } catch (injectError) {
        const errorMsg = injectError instanceof Error ? injectError.message : String(injectError)
        console.error('[chromeService] 注入失败:', injectError)

        if (errorMsg.includes('Cannot access') || errorMsg.includes('permission')) {
          return {
            success: false,
            error: '无法注入脚本：页面可能使用了严格的内容安全策略（CSP）',
          }
        }

        return { success: false, error: `注入失败: ${errorMsg}` }
      }
    }
  }

  return { success: false, error: '无法连接到 content script' }
}

/**
 * 获取自动打招呼状态
 */
export async function getAutoGreetStatus(): Promise<AutoGreetStatus | null> {
  try {
    const tab = await getCurrentTab()
    if (!tab || !tab.id) return null

    try {
      const response = await sendMessageToTab<AutoGreetStatus>(tab.id, 'getAutoGreetStatus')
      if (response.success && response.data) {
        return response.data
      }
    } catch (err) {
      console.debug('[chromeService] 无法获取状态，可能页面未加载 content script')
    }

    return null
  } catch (err) {
    console.error('[chromeService] 获取自动打招呼状态失败:', err)
    return null
  }
}

/**
 * 启动自动打招呼
 */
export async function startAutoGreet(): Promise<MessageResponse> {
  console.log('[chromeService] 启动自动打招呼')

  const tab = await getCurrentTab()
  if (!tab || !tab.id) {
    return { success: false, error: '无法获取当前标签页' }
  }

  // 先尝试直接发送消息
  try {
    const response = await sendMessageToTab(tab.id, 'startAutoGreet')
    if (response.success) {
      return response
    }
    throw new Error(response.error || '启动失败')
  } catch (directError) {
    // 直接发送失败，尝试注入
    console.log('[chromeService] 直接发送失败，尝试注入 content script...', directError)

    const injectResult = await ensureContentScript(tab.id)
    if (!injectResult.success) {
      return { success: false, error: injectResult.error || '无法注入 content script' }
    }

    // 注入后再次尝试
    const response = await sendMessageToTab(tab.id, 'startAutoGreet')
    if (response.success) {
      return response
    }

    return { success: false, error: response.error || '启动失败' }
  }
}

/**
 * 停止自动打招呼
 */
export async function stopAutoGreet(): Promise<MessageResponse> {
  const tab = await getCurrentTab()
  if (!tab || !tab.id) {
    return { success: false, error: '无法获取当前标签页' }
  }

  const response = await sendMessageToTab(tab.id, 'stopAutoGreet')
  return response
}
