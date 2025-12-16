import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

export function Popup() {
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [pageInfo, setPageInfo] = useState<{ title?: string; url?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 检查并注入 content script
  const ensureContentScript = async (tabId: number): Promise<{ success: boolean; error?: string }> => {
    console.log('[Popup] 开始检查 content script, tabId:', tabId)
    
    // 尝试多次 ping，因为 content script 可能需要时间加载
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[Popup] 尝试 ping content script (第 ${attempt + 1} 次)`)
        const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
        console.log('[Popup] Ping 成功，收到响应:', pingResponse)
        return { success: true }
      } catch (pingError) {
        console.log(`[Popup] Ping 失败 (第 ${attempt + 1} 次):`, pingError)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 200))
          continue
        }
        
        console.log('[Popup] 所有 ping 尝试失败，尝试动态注入...')
        
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          })
          console.log('[Popup] Content script 注入成功')
          
          await new Promise(resolve => setTimeout(resolve, 500))
          
          try {
            const finalPing = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
            console.log('[Popup] 注入后 ping 成功:', finalPing)
            return { success: true }
          } catch (finalPingError) {
            console.error('[Popup] 注入后 ping 仍然失败:', finalPingError)
            return { success: false, error: 'Content script 已注入但无法响应，可能是页面安全策略限制' }
          }
        } catch (injectError) {
          const errorMsg = injectError instanceof Error ? injectError.message : String(injectError)
          console.error('[Popup] 注入失败:', injectError)
          
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

  useEffect(() => {
    // 初始化时获取当前标签页 URL
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setCurrentUrl(tab.url || '')
    })
  }, [])

  return (
    <div className="w-96 max-h-[600px] overflow-y-auto p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Chrome 扩展模板</h1>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            <strong>当前页面：</strong>
            <div className="mt-1 break-all text-xs text-gray-500">{currentUrl || '未知'}</div>
          </div>
        </div>

        <button
          onClick={getPageInfo}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '获取中...' : '获取页面信息'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm whitespace-pre-line">
            {error}
          </div>
        )}

        {pageInfo && (
          <div className="border border-gray-300 rounded-lg p-3 space-y-2">
            <h2 className="font-semibold text-lg">页面信息</h2>
            {pageInfo.title && (
              <div className="text-sm">
                <strong>标题：</strong>
                <div className="mt-1 text-gray-700">{pageInfo.title}</div>
              </div>
            )}
            {pageInfo.url && (
              <div className="text-sm">
                <strong>URL：</strong>
                <div className="mt-1 text-gray-700 break-all text-xs">{pageInfo.url}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}
