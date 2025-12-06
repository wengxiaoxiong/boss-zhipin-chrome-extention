import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'

interface FeedSection {
  index: number
  noteId?: string
  link?: string
  coverImage?: string
  title?: string
  authorName?: string
  authorAvatar?: string
  authorLink?: string
  likeCount?: string
  dataWidth?: string
  dataHeight?: string
}

interface UserPostedFeedsData {
  feeds: FeedSection[]
  count: number
  timestamp: string
  url: string
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

export function Popup() {
  const [feedsData, setFeedsData] = useState<UserPostedFeedsData | null>(null)
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [feedsError, setFeedsError] = useState<string | null>(null)
  const [isProfilePage, setIsProfilePage] = useState(false)
  const [isSearchPage, setIsSearchPage] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string>('')

  // 检查并注入 content script
  const ensureContentScript = async (tabId: number): Promise<{ success: boolean; error?: string }> => {
    console.log('[Popup] 开始检查 content script, tabId:', tabId);
    
    // 尝试多次 ping，因为 content script 可能需要时间加载
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[Popup] 尝试 ping content script (第 ${attempt + 1} 次)`);
        const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        console.log('[Popup] Ping 成功，收到响应:', pingResponse);
        return { success: true } // content script 已存在
      } catch (pingError) {
        console.log(`[Popup] Ping 失败 (第 ${attempt + 1} 次):`, pingError);
        if (attempt < 2) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        // 最后一次尝试失败，尝试动态注入
        console.log('[Popup] 所有 ping 尝试失败，尝试动态注入...');
        
        try {
          // 动态注入 content script 文件
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js'],
          })
          console.log('[Popup] Content script 注入成功');
          
          // 等待脚本初始化
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // 再次尝试 ping，确认注入成功
          try {
            const finalPing = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            console.log('[Popup] 注入后 ping 成功:', finalPing);
            return { success: true }
          } catch (finalPingError) {
            console.error('[Popup] 注入后 ping 仍然失败:', finalPingError);
            return { success: false, error: 'Content script 已注入但无法响应，可能是页面安全策略限制' }
          }
        } catch (injectError) {
          const errorMsg = injectError instanceof Error ? injectError.message : String(injectError)
          console.error('[Popup] 注入失败:', injectError)
          
          // 检查是否是权限问题
          if (errorMsg.includes('Cannot access') || errorMsg.includes('permission')) {
            return { success: false, error: '无法注入脚本：页面可能使用了严格的内容安全策略（CSP）' }
          }
          
          return { success: false, error: `注入失败: ${errorMsg}` }
        }
      }
    }
    
    return { success: false, error: '无法连接到 content script' }
  }

  // 检查页面类型
  const checkPageType = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const url = tab.url || ''
      setCurrentUrl(url)
      
      // 检查 URL 是否匹配小红书个人主页格式
      const profilePattern = /^https:\/\/www\.xiaohongshu\.com\/user\/profile\/[^/]+/
      const isProfile = profilePattern.test(url)
      setIsProfilePage(isProfile)
      
      // 检查 URL 是否匹配小红书搜索结果页格式
      const searchPattern = /^https:\/\/www\.xiaohongshu\.com\/search_result/
      const isSearch = searchPattern.test(url)
      setIsSearchPage(isSearch)
    } catch (err) {
      console.error('Error checking URL:', err)
      setIsProfilePage(false)
      setIsSearchPage(false)
    }
  }

  // 获取小红书个人主页数据
  const getUserPostedFeeds = async () => {
    setFeedsLoading(true)
    setFeedsError(null)
    
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
      let response: MessageResponse | undefined
      try {
        response = await chrome.tabs.sendMessage(tab.id, { action: 'getUserPostedFeeds' }) as MessageResponse | undefined
      } catch (sendError) {
        console.error('发送消息失败:', sendError)
        throw new Error(`发送消息失败: ${sendError instanceof Error ? sendError.message : String(sendError)}`)
      }
      
      if (!response) {
        console.error('响应为 undefined')
        throw new Error('未收到 content script 的响应，可能是消息监听器未正确设置或 content script 未正确注入')
      }
      
      console.log('收到响应:', response)
      
      if (response.success && response.data) {
        setFeedsData(response.data as UserPostedFeedsData)
      } else {
        throw new Error(response.error || '获取小红书数据失败')
      }
    } catch (err) {
      console.error('Error:', err)
      if (err instanceof Error) {
        // 处理 Chrome 扩展 API 错误
        if (err.message.includes('Receiving end does not exist')) {
          setFeedsError('无法连接到页面。\n\n可能原因：\n• 页面使用了严格的内容安全策略（CSP）\n• 页面是 iframe 或特殊页面\n• Content script 未正确注入\n\n建议：\n1. 刷新页面后重试\n2. 检查浏览器控制台是否有错误')
        } else if (err.message.includes('Cannot access')) {
          setFeedsError('无法访问此页面。\n\n该页面可能：\n• 使用了严格的安全策略\n• 是系统页面（chrome://、edge:// 等）\n• 不允许脚本注入')
        } else {
          setFeedsError(err.message)
        }
      } else {
        setFeedsError('未知错误：' + String(err))
      }
    } finally {
      setFeedsLoading(false)
    }
  }

  // 获取小红书搜索结果页数据
  const getSearchResultFeeds = async () => {
    setFeedsLoading(true)
    setFeedsError(null)
    
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
      console.log('[Popup] 准备发送消息 getSearchResultFeeds 到 tab:', tab.id);
      let response: MessageResponse | undefined
      try {
        const message = { action: 'getSearchResultFeeds' as const };
        console.log('[Popup] 发送消息:', message);
        response = await chrome.tabs.sendMessage(tab.id, message) as MessageResponse | undefined
        console.log('[Popup] 收到原始响应:', response);
      } catch (sendError) {
        console.error('[Popup] 发送消息失败:', sendError)
        throw new Error(`发送消息失败: ${sendError instanceof Error ? sendError.message : String(sendError)}`)
      }
      
      if (!response) {
        console.error('[Popup] 响应为 undefined')
        throw new Error('未收到 content script 的响应，可能是消息监听器未正确设置或 content script 未正确注入')
      }
      
      console.log('[Popup] 收到响应:', response)
      
      if (response.success && response.data) {
        setFeedsData(response.data as UserPostedFeedsData)
      } else {
        throw new Error(response.error || '获取小红书搜索结果数据失败')
      }
    } catch (err) {
      console.error('Error:', err)
      if (err instanceof Error) {
        // 处理 Chrome 扩展 API 错误
        if (err.message.includes('Receiving end does not exist')) {
          setFeedsError('无法连接到页面。\n\n可能原因：\n• 页面使用了严格的内容安全策略（CSP）\n• 页面是 iframe 或特殊页面\n• Content script 未正确注入\n\n建议：\n1. 刷新页面后重试\n2. 检查浏览器控制台是否有错误')
        } else if (err.message.includes('Cannot access')) {
          setFeedsError('无法访问此页面。\n\n该页面可能：\n• 使用了严格的安全策略\n• 是系统页面（chrome://、edge:// 等）\n• 不允许脚本注入')
        } else {
          setFeedsError(err.message)
        }
      } else {
        setFeedsError('未知错误：' + String(err))
      }
    } finally {
      setFeedsLoading(false)
    }
  }

  useEffect(() => {
    checkPageType()
  }, [])

  return (
    <div className="w-96 max-h-[600px] overflow-y-auto p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">WXX版 小红书数据获取</h1>
      
      <div className="space-y-4">
        {!isProfilePage && !isSearchPage ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-semibold mb-1">当前页面不支持数据获取</p>
            <p className="text-xs text-yellow-700 mb-2">
              支持的页面类型：
            </p>
            <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
              <li>个人主页：<code className="bg-yellow-100 px-1 rounded">https://www.xiaohongshu.com/user/profile/XXX</code></li>
              <li>搜索结果页：<code className="bg-yellow-100 px-1 rounded">https://www.xiaohongshu.com/search_result...</code></li>
            </ul>
            {currentUrl && (
              <p className="text-xs text-yellow-600 mt-2 break-all">
                当前页面: {currentUrl}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* 获取小红书数据按钮 */}
            {isProfilePage && (
              <button
                onClick={getUserPostedFeeds}
                disabled={feedsLoading}
                className="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {feedsLoading ? '获取中...' : '获取小红书个人主页数据'}
              </button>
            )}
            {isSearchPage && (
              <button
                onClick={getSearchResultFeeds}
                disabled={feedsLoading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {feedsLoading ? '获取中...' : '获取小红书搜索结果数据'}
              </button>
            )}

            {/* 小红书数据错误提示 */}
            {feedsError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm whitespace-pre-line">
                {feedsError}
              </div>
            )}

            {/* 小红书数据显示 */}
            {feedsData && (
              <div className="border border-gray-300 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">小红书数据</h2>
                  <span className="text-sm text-gray-500">共 {feedsData.count} 条</span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(feedsData.timestamp).toLocaleString('zh-CN')}
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {feedsData.feeds.map((feed) => (
                    <div key={feed.index} className="border border-gray-200 rounded p-2 bg-gray-50">
                      <div className="flex gap-2">
                        {feed.coverImage && (
                          <img 
                            src={feed.coverImage} 
                            alt={feed.title || '封面'} 
                            className="w-16 h-16 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          {feed.title && (
                            <div className="font-medium text-sm text-gray-800 truncate">
                              {feed.title}
                            </div>
                          )}
                          {feed.authorName && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              {feed.authorAvatar && (
                                <img 
                                  src={feed.authorAvatar} 
                                  alt={feed.authorName}
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span>{feed.authorName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {feed.likeCount && (
                              <span>❤️ {feed.likeCount}</span>
                            )}
                            {feed.dataWidth && feed.dataHeight && (
                              <span>{feed.dataWidth} × {feed.dataHeight}</span>
                            )}
                          </div>
                          {feed.link && (
                            <a 
                              href={feed.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline truncate block"
                              title={feed.link}
                            >
                              查看笔记
                            </a>
                          )}
                          {feed.noteId && (
                            <div className="text-xs text-gray-400 font-mono truncate">
                              ID: {feed.noteId}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const json = JSON.stringify(feedsData, null, 2)
                    navigator.clipboard.writeText(json)
                    alert('数据已复制到剪贴板')
                  }}
                  className="w-full px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                >
                  复制 JSON 数据
                </button>
              </div>
            )}
          </>
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
