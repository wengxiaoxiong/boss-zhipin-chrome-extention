import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

export function Sidepanel() {
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [pageInfo, setPageInfo] = useState<{ title?: string; url?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 自动打招呼状态
  const [autoGreetStatus, setAutoGreetStatus] = useState<{
    isRunning: boolean
    clickedCount: number
    isCorrectPage: boolean
  }>({ isRunning: false, clickedCount: 0, isCorrectPage: false })
  const [autoGreetLoading, setAutoGreetLoading] = useState(false)
  const [autoGreetError, setAutoGreetError] = useState<string | null>(null)

  // 检查并注入 content script
  const ensureContentScript = async (tabId: number, skipPing = false): Promise<{ success: boolean; error?: string }> => {
    console.log('[Sidepanel] 开始检查 content script, tabId:', tabId, 'skipPing:', skipPing)

    // 如果已经 ping 过，直接返回成功
    if (skipPing) {
      console.log('[Sidepanel] 跳过 ping，直接返回成功')
      return { success: true }
    }

    // 尝试多次 ping，因为 content script 可能需要时间加载
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[Sidepanel] 尝试 ping content script (第 ${attempt + 1} 次)`)
        const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
        console.log('[Sidepanel] Ping 成功，收到响应:', pingResponse)
        return { success: true }
      } catch (pingError) {
        console.log(`[Sidepanel] Ping 失败 (第 ${attempt + 1} 次):`, pingError)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 200))
          continue
        }

        console.log('[Sidepanel] 所有 ping 尝试失败，尝试动态注入...')

        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          })
          console.log('[Sidepanel] Content script 注入成功')

          await new Promise(resolve => setTimeout(resolve, 500))

          try {
            const finalPing = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
            console.log('[Sidepanel] 注入后 ping 成功:', finalPing)
            return { success: true }
          } catch (finalPingError) {
            console.error('[Sidepanel] 注入后 ping 仍然失败:', finalPingError)
            return { success: false, error: 'Content script 已注入但无法响应，可能是页面安全策略限制' }
          }
        } catch (injectError) {
          const errorMsg = injectError instanceof Error ? injectError.message : String(injectError)
          console.error('[Sidepanel] 注入失败:', injectError)

          if (errorMsg.includes('Cannot access') || errorMsg.includes('permission')) {
            return { success: false, error: '无法注入脚本：页面可能使用了严格的内容安全策略（CSP）' }
          }

          return { success: false, error: `注入失败: ${errorMsg}` }
        }
      }
    }

    return { success: false, error: '无法连接到 content script' }
  }

  // 获取当前页面信息
  const getPageInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        throw new Error('无法获取当前标签页')
      }

      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
        throw new Error('无法在此类型的页面上运行扩展（chrome://、edge:// 等系统页面）')
      }

      const url = tab.url || ''
      setCurrentUrl(url)

      // 确保 content script 已注入
      const injectResult = await ensureContentScript(tab.id)
      if (!injectResult.success) {
        throw new Error(injectResult.error || '无法注入 content script')
      }

      // 向 content script 发送消息获取页面信息
      let response: MessageResponse | undefined
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }) as MessageResponse | undefined
      } catch (sendError) {
        console.error('发送消息失败:', sendError)
        throw new Error(`发送消息失败: ${sendError instanceof Error ? sendError.message : String(sendError)}`)
      }

      if (!response) {
        throw new Error('未收到 content script 的响应')
      }

      if (response.success && response.data) {
        setPageInfo(response.data as { title?: string; url?: string })
      } else {
        throw new Error(response.error || '获取页面信息失败')
      }
    } catch (err) {
      console.error('Error:', err)
      if (err instanceof Error) {
        if (err.message.includes('Receiving end does not exist')) {
          setError('无法连接到页面。\n\n可能原因：\n• 页面使用了严格的内容安全策略（CSP）\n• 页面是 iframe 或特殊页面\n• Content script 未正确注入\n\n建议：\n1. 刷新页面后重试\n2. 检查浏览器控制台是否有错误')
        } else if (err.message.includes('Cannot access')) {
          setError('无法访问此页面。\n\n该页面可能：\n• 使用了严格的安全策略\n• 是系统页面（chrome://、edge:// 等）\n• 不允许脚本注入')
        } else {
          setError(err.message)
        }
      } else {
        setError('未知错误：' + String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  // 获取自动打招呼状态
  const fetchAutoGreetStatus = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) return

      // 尝试直接发送消息，如果失败则注入
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getAutoGreetStatus' }) as MessageResponse

        if (response.success && response.data) {
          const data = response.data as { isRunning: boolean; clickedCount: number; isCorrectPage: boolean }
          setAutoGreetStatus(data)
        }
      } catch (err) {
        // 消息发送失败，可能 content script 未注入，但不影响功能
        console.debug('[Sidepanel] 无法获取状态，可能页面未加载 content script')
      }
    } catch (err) {
      console.error('获取自动打招呼状态失败:', err)
    }
  }

  // 开始自动打招呼
  const startAutoGreet = async () => {
    console.log('[Sidepanel] 用户点击开始按钮')
    setAutoGreetLoading(true)
    setAutoGreetError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      console.log('[Sidepanel] 当前标签页:', tab.id, tab.url)

      if (!tab.id) {
        throw new Error('无法获取当前标签页')
      }

      // 先尝试直接发送消息
      console.log('[Sidepanel] 尝试直接发送 startAutoGreet 消息...')
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'startAutoGreet' }) as MessageResponse
        console.log('[Sidepanel] 收到响应:', response)

        if (response.success) {
          console.log('[Sidepanel] 启动成功')
          await fetchAutoGreetStatus()
          return
        } else {
          throw new Error(response.error || '启动失败')
        }
      } catch (directError) {
        // 直接发送失败，尝试注入
        console.log('[Sidepanel] 直接发送失败，尝试注入 content script...', directError)

        const injectResult = await ensureContentScript(tab.id)
        if (!injectResult.success) {
          throw new Error(injectResult.error || '无法注入 content script')
        }

        // 注入后再次尝试
        console.log('[Sidepanel] 注入成功，重新发送消息...')
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'startAutoGreet' }) as MessageResponse
        console.log('[Sidepanel] 收到响应:', response)

        if (response.success) {
          console.log('[Sidepanel] 启动成功')
          await fetchAutoGreetStatus()
        } else {
          throw new Error(response.error || '启动失败')
        }
      }
    } catch (err) {
      console.error('[Sidepanel] 启动自动打招呼失败:', err)
      setAutoGreetError(err instanceof Error ? err.message : String(err))
    } finally {
      setAutoGreetLoading(false)
    }
  }

  // 停止自动打招呼
  const stopAutoGreet = async () => {
    setAutoGreetLoading(true)
    setAutoGreetError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        throw new Error('无法获取当前标签页')
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'stopAutoGreet' }) as MessageResponse

      if (response.success) {
        await fetchAutoGreetStatus()
      } else {
        throw new Error(response.error || '停止失败')
      }
    } catch (err) {
      console.error('停止自动打招呼失败:', err)
      setAutoGreetError(err instanceof Error ? err.message : String(err))
    } finally {
      setAutoGreetLoading(false)
    }
  }

  useEffect(() => {
    // 初始化时获取当前标签页 URL
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setCurrentUrl(tab.url || '')
    })

    // 定期更新自动打招呼状态
    fetchAutoGreetStatus()
    const interval = setInterval(fetchAutoGreetStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-screen overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">BOSS 直聘助手</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
            <div className="text-sm text-gray-600">
              <strong className="text-base">当前页面：</strong>
              <div className="mt-2 break-all text-xs text-gray-500 bg-gray-50 p-2 rounded">{currentUrl || '未知'}</div>
            </div>
          </div>

          {/* 自动打招呼功能 */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">自动打招呼</h2>
              {autoGreetStatus.isRunning && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  运行中
                </span>
              )}
            </div>

            {!autoGreetStatus.isCorrectPage && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
                提示：此功能适用于 BOSS 直聘推荐页面（https://www.zhipin.com/web/chat/recommend）
                <div className="mt-1 text-xs">当前页面: {currentUrl}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">状态</div>
                <div className="text-lg font-semibold text-gray-800">
                  {autoGreetStatus.isRunning ? '运行中' : '已停止'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">已点击数</div>
                <div className="text-lg font-semibold text-gray-800">{autoGreetStatus.clickedCount}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startAutoGreet}
                disabled={autoGreetLoading || autoGreetStatus.isRunning}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {autoGreetLoading ? '启动中...' : '开始'}
              </button>
              <button
                onClick={stopAutoGreet}
                disabled={autoGreetLoading || !autoGreetStatus.isRunning}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {autoGreetLoading ? '停止中...' : '停止'}
              </button>
            </div>

            {autoGreetError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {autoGreetError}
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p>功能说明：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>自动扫描候选人卡片并点击"打招呼"按钮</li>
                <li>每个候选人点击后等待5秒再继续</li>
                <li>自动记录已点击的候选人，避免重复</li>
                <li>自动滚动页面加载更多候选人</li>
              </ul>
            </div>
          </div>

          {/* 原有的获取页面信息功能 */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">页面信息</h2>

            <button
              onClick={getPageInfo}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
            >
              {loading ? '获取中...' : '获取页面信息'}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm whitespace-pre-line shadow-sm">
                {error}
              </div>
            )}

            {pageInfo && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {pageInfo.title && (
                  <div className="text-sm">
                    <strong className="text-gray-700">标题：</strong>
                    <div className="mt-1 text-gray-700 p-2 rounded">{pageInfo.title}</div>
                  </div>
                )}
                {pageInfo.url && (
                  <div className="text-sm">
                    <strong className="text-gray-700">URL：</strong>
                    <div className="mt-1 text-gray-700 break-all text-xs p-2 rounded">{pageInfo.url}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Sidepanel />)
}
