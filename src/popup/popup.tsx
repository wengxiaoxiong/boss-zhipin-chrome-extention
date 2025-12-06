import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'

interface DOMData {
  title: string
  url: string
  html: string
  text: string
  links: Array<{ href: string; text: string }>
  images: Array<{ src: string; alt: string }>
  timestamp: string
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

function Popup() {
  const [domData, setDomData] = useState<DOMData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storedData, setStoredData] = useState<unknown>(null)
  const [storageKey, setStorageKey] = useState('domData')

  // 检查并注入 content script
  const ensureContentScript = async (tabId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // 先尝试发送一个 ping 消息，检查 content script 是否已注入
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' })
        return { success: true } // content script 已存在
      } catch {
        // 如果发送消息失败，说明 content script 未注入，需要动态注入
        console.log('Content script not found, injecting...')
        
        try {
          // 动态注入 content script 文件
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          })
          
          // 等待一小段时间让脚本初始化
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // 再次尝试 ping，确认注入成功
          try {
            await chrome.tabs.sendMessage(tabId, { action: 'ping' })
            return { success: true }
          } catch {
            return { success: false, error: 'Content script 已注入但无法响应，可能是页面安全策略限制' }
          }
        } catch (injectError) {
          const errorMsg = injectError instanceof Error ? injectError.message : String(injectError)
          console.error('Failed to inject content script:', injectError)
          
          // 检查是否是权限问题
          if (errorMsg.includes('Cannot access') || errorMsg.includes('permission')) {
            return { success: false, error: '无法注入脚本：页面可能使用了严格的内容安全策略（CSP）' }
          }
          
          return { success: false, error: `注入失败: ${errorMsg}` }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Failed to ensure content script:', err)
      return { success: false, error: errorMsg }
    }
  }

  // 获取当前页面的 DOM
  const getDOM = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (!tab.id) {
        throw new Error('无法获取当前标签页')
      }

      // 检查标签页 URL 是否支持注入
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
        throw new Error('无法在此类型的页面上运行扩展（chrome://、edge:// 等系统页面）')
      }

      // 确保 content script 已注入
      const injectResult = await ensureContentScript(tab.id)
      if (!injectResult.success) {
        throw new Error(injectResult.error || '无法注入 content script')
      }

      // 向 content script 发送消息
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getDOM' }) as MessageResponse
      
      if (response.success && response.data) {
        setDomData(response.data as DOMData)
        // 自动保存到存储
        await saveToStorage(response.data)
      } else {
        throw new Error(response.error || '获取 DOM 失败')
      }
    } catch (err) {
      console.error('Error:', err)
      if (err instanceof Error) {
        // 处理 Chrome 扩展 API 错误
        if (err.message.includes('Receiving end does not exist')) {
          setError('无法连接到页面。\n\n可能原因：\n• 页面使用了严格的内容安全策略（CSP）\n• 页面是 iframe 或特殊页面\n• Content script 未正确注入\n\n建议：\n1. 刷新页面后重试\n2. 检查浏览器控制台是否有错误\n3. 某些企业应用（如飞书）可能限制扩展功能')
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

  // 保存数据到 Chrome 存储
  const saveToStorage = async (data: unknown) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveData',
        key: storageKey,
        value: data,
      }) as MessageResponse
      
      if (response.success) {
        console.log('数据已保存')
        await loadFromStorage()
      } else {
        throw new Error(response.error || '保存失败')
      }
    } catch (err) {
      console.error('Save error:', err)
    }
  }

  // 从 Chrome 存储加载数据
  const loadFromStorage = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getData',
        key: storageKey,
      }) as MessageResponse
      
      if (response.success) {
        setStoredData(response.data)
      }
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  // 清除存储
  const clearStorage = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearData',
        key: storageKey,
      }) as MessageResponse
      
      if (response.success) {
        setStoredData(null)
        console.log('存储已清除')
      }
    } catch (err) {
      console.error('Clear error:', err)
    }
  }

  useEffect(() => {
    loadFromStorage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-96 p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">XHS Extension</h1>
      
      <div className="space-y-4">
        {/* 获取 DOM 按钮 */}
        <button
          onClick={getDOM}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '获取中...' : '获取当前页面 DOM'}
        </button>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* DOM 数据显示 */}
        {domData && (
          <div className="border border-gray-300 rounded-lg p-3 space-y-2">
            <h2 className="font-semibold text-lg">页面信息</h2>
            <div className="text-sm space-y-1">
              <p><strong>标题:</strong> {domData.title}</p>
              <p><strong>URL:</strong> <a href={domData.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{domData.url}</a></p>
              <p><strong>链接数:</strong> {domData.links.length}</p>
              <p><strong>图片数:</strong> {domData.images.length}</p>
              <p><strong>文本长度:</strong> {domData.text.length} 字符</p>
              <p><strong>时间:</strong> {new Date(domData.timestamp).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        )}

        {/* 存储管理 */}
        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">存储管理</h2>
          <div className="space-y-2">
            <input
              type="text"
              value={storageKey}
              onChange={(e) => setStorageKey(e.target.value)}
              placeholder="存储键名"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={loadFromStorage}
                className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                加载
              </button>
              <button
                onClick={clearStorage}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                清除
              </button>
            </div>
            {storedData !== null && (
              <div className="p-2 bg-gray-100 rounded text-xs max-h-32 overflow-y-auto">
                <pre>{JSON.stringify(storedData, null, 2)}</pre>
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
  root.render(<Popup />)
}
