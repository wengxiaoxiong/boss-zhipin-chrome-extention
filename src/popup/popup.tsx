import { useState, useEffect, useCallback } from 'react'
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

interface UserInfo {
  nickname?: string
  redId?: string
  avatar?: string
  description?: string
  tags?: string[]
  gender?: 'male' | 'female'
  location?: string
  followingCount?: string
  followersCount?: string
  likesAndCollectionsCount?: string
}

interface UserPostedFeedsData {
  feeds: FeedSection[]
  count: number
  timestamp: string
  url: string
  userInfo?: UserInfo // 仅在 userProfile 模式下存在
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

interface HistoryItem {
  key: string
  data: {
    collectedAt?: string
    updatedAt?: string
    count?: number
    totalCount?: number
    url?: string
    action?: string
    userInfo?: UserInfo
    feeds?: FeedSection[]
    newFeeds?: FeedSection[]
    [key: string]: unknown
  }
  type: 'collection' | 'update'
}

export function Popup() {
  const [feedsData, setFeedsData] = useState<UserPostedFeedsData | null>(null)
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [feedsError, setFeedsError] = useState<string | null>(null)
  const [isProfilePage, setIsProfilePage] = useState(false)
  const [isSearchPage, setIsSearchPage] = useState(false)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null)
  
  // 使用 Map 存储所有已见过的 feeds，key 是 title（用于去重和增量更新）
  const [feedsMapRef] = useState<{ current: Map<string, FeedSection> }>({ current: new Map() })
  
  /**
   * 获取 feed 的唯一标识（优先使用 noteId，因为它是唯一标识符）
   * 如果没有 noteId，则使用 link（通常包含 noteId）
   * 最后才使用 title（因为不同笔记可能有相同标题）
   */
  const getFeedKey = useCallback((feed: FeedSection): string => {
    // 优先使用 noteId（最可靠的唯一标识）
    if (feed.noteId) {
      return `noteId:${feed.noteId}`
    }
    // 其次使用 link（通常包含 noteId，且是唯一的）
    if (feed.link) {
      return `link:${feed.link}`
    }
    // 最后使用 title（但加上作者名作为组合键，提高唯一性）
    if (feed.title) {
      const authorPart = feed.authorName ? `:${feed.authorName}` : ''
      return `title:${feed.title}${authorPart}`
    }
    // 如果都没有，使用 index（这种情况应该很少）
    return `index:${feed.index}`
  }, [])
  
  /**
   * 合并新的 feeds 到 Map 中
   */
  const mergeNewFeeds = useCallback((newFeeds: FeedSection[], url: string, userInfo?: UserInfo) => {
    const newMap = new Map(feedsMapRef.current)
    
    // 如果 URL 变化，清空 Map（新页面）
    const currentUrlKey = '__current_url__'
    const lastUrl = newMap.get(currentUrlKey)?.link
    if (lastUrl && lastUrl !== url) {
      newMap.clear()
      console.log('[Popup] 检测到 URL 变化，清空 feeds Map')
    }
    
    // 添加新的 feeds
    let addedCount = 0
    for (const feed of newFeeds) {
      const key = getFeedKey(feed)
      if (!newMap.has(key)) {
        newMap.set(key, feed)
        addedCount++
      }
    }
    
    // 保存当前 URL
    newMap.set(currentUrlKey, { index: -1, link: url } as FeedSection)
    
    // 更新 Map 引用
    feedsMapRef.current = newMap
    
    // 更新 feedsData 状态
    const allFeeds = Array.from(newMap.values()).filter(
      (feed) => feed.index !== -1 // 排除 __current_url__ 这个特殊项
    )
    
    setFeedsData({
      feeds: allFeeds,
      count: allFeeds.length,
      timestamp: new Date().toISOString(),
      url: url,
      userInfo: userInfo || feedsData?.userInfo, // 保留已有的 userInfo 或使用新的
    })
    
    if (addedCount > 0) {
      console.log(`[Popup] 合并了 ${addedCount} 条新笔记（总计 ${allFeeds.length} 条）`)
    }
  }, [feedsMapRef, getFeedKey, feedsData?.userInfo])

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
        const data = response.data as UserPostedFeedsData
        // 使用增量更新方式合并数据
        mergeNewFeeds(data.feeds, data.url, data.userInfo)
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
        const data = response.data as UserPostedFeedsData
        // 使用增量更新方式合并数据
        mergeNewFeeds(data.feeds, data.url, data.userInfo)
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

  // 获取历史记录
  const getHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getHistory' }) as MessageResponse
      if (response.success && response.data) {
        setHistory(response.data as HistoryItem[])
      } else {
        console.error('获取历史记录失败:', response.error)
      }
    } catch (err) {
      console.error('获取历史记录异常:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 删除历史记录
  const deleteHistory = async (keys: string[]) => {
    if (!confirm(`确定要删除 ${keys.length} 条历史记录吗？`)) {
      return
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'deleteHistory',
        keys 
      }) as MessageResponse
      
      if (response.success) {
        // 重新获取历史记录
        await getHistory()
        // 如果删除的是当前选中的记录，清空选中
        if (selectedHistory && keys.includes(selectedHistory.key)) {
          setSelectedHistory(null)
        }
      } else {
        alert('删除失败: ' + response.error)
      }
    } catch (err) {
      console.error('删除历史记录异常:', err)
      alert('删除失败: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  useEffect(() => {
    checkPageType()
    // 初始加载历史记录
    getHistory()
  }, [])

  // 监听来自 content script 的自动更新消息（增量更新）
  useEffect(() => {
    const messageListener = (
      message: { 
        action: string
        data?: {
          newFeeds?: FeedSection[]
          totalCount?: number
          timestamp?: string
          url?: string
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _sender: chrome.runtime.MessageSender,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _sendResponse: (response?: unknown) => void
    ) => {
      if (message.action === 'feedsUpdated' && message.data) {
        console.log('[Popup] 收到增量更新消息:', message.data)
        const { newFeeds = [], url = window.location.href } = message.data
        
        if (newFeeds.length > 0) {
          mergeNewFeeds(newFeeds, url)
        }
        
        setFeedsError(null) // 清除之前的错误
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    // 清理监听器
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [mergeNewFeeds])

  return (
    <div className="w-96 max-h-[600px] overflow-y-auto p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">WXX版 小红书数据获取</h1>
        <button
          onClick={() => {
            setShowHistory(!showHistory)
            if (!showHistory) {
              getHistory()
            }
          }}
          className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          {showHistory ? '返回' : '历史记录'}
        </button>
      </div>
      
      {showHistory ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">历史爬取记录</h2>
            <button
              onClick={getHistory}
              disabled={historyLoading}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 transition-colors"
            >
              {historyLoading ? '加载中...' : '刷新'}
            </button>
          </div>
          
          {historyLoading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无历史记录</div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const timestamp = item.data.collectedAt || item.data.updatedAt || ''
                const date = timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '未知时间'
                const count = item.data.count || item.data.totalCount || 0
                const url = item.data.url || ''
                const action = item.data.action || (item.type === 'collection' ? '采集' : '更新')
                
                return (
                  <div
                    key={item.key}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedHistory?.key === item.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => setSelectedHistory(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            item.type === 'collection'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {item.type === 'collection' ? '采集' : '更新'}
                          </span>
                          <span className="text-xs text-gray-500">{action}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-800 mb-1">
                          {count} 条笔记
                        </div>
                        <div className="text-xs text-gray-500 mb-1">{date}</div>
                        {url && (
                          <div className="text-xs text-gray-400 truncate" title={url}>
                            {url}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteHistory([item.key])
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {selectedHistory && (
            <div className="border border-gray-300 rounded-lg p-3 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">记录详情</h3>
                <button
                  onClick={() => setSelectedHistory(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  关闭
                </button>
              </div>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">类型：</span>
                  {selectedHistory.type === 'collection' ? '采集' : '更新'}
                </div>
                <div>
                  <span className="font-medium">时间：</span>
                  {selectedHistory.data.collectedAt || selectedHistory.data.updatedAt || '未知'}
                </div>
                <div>
                  <span className="font-medium">数量：</span>
                  {selectedHistory.data.count || selectedHistory.data.totalCount || 0} 条
                </div>
                {selectedHistory.data.url && (
                  <div>
                    <span className="font-medium">URL：</span>
                    <a
                      href={selectedHistory.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline break-all"
                    >
                      {selectedHistory.data.url}
                    </a>
                  </div>
                )}
              </div>
              
              {selectedHistory.data.userInfo && (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
                  <h4 className="font-semibold text-sm text-blue-800">用户信息</h4>
                  <div className="flex items-start gap-3">
                    {selectedHistory.data.userInfo.avatar && (
                      <img 
                        src={selectedHistory.data.userInfo.avatar} 
                        alt={selectedHistory.data.userInfo.nickname || '用户头像'} 
                        className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-blue-200"
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      {selectedHistory.data.userInfo.nickname && (
                        <div className="font-semibold text-sm text-gray-800">
                          {selectedHistory.data.userInfo.nickname}
                        </div>
                      )}
                      {selectedHistory.data.userInfo.redId && (
                        <div className="text-xs text-gray-600">
                          小红书号：{selectedHistory.data.userInfo.redId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedHistory.data.feeds && selectedHistory.data.feeds.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  <h4 className="font-semibold text-sm">笔记列表</h4>
                  {selectedHistory.data.feeds.slice(0, 10).map((feed: FeedSection, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 bg-gray-50 text-xs">
                      <div className="flex gap-2">
                        {feed.coverImage && (
                          <img 
                            src={feed.coverImage} 
                            alt={feed.title || '封面'} 
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {feed.title && (
                            <div className="font-medium text-gray-800 truncate mb-1">
                              {feed.title}
                            </div>
                          )}
                          {feed.authorName && (
                            <div className="text-gray-600 mb-1">{feed.authorName}</div>
                          )}
                          {feed.likeCount && (
                            <div className="text-gray-500">❤️ {feed.likeCount}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedHistory.data.feeds.length > 10 && (
                    <div className="text-xs text-gray-500 text-center">
                      还有 {selectedHistory.data.feeds.length - 10} 条笔记...
                    </div>
                  )}
                </div>
              )}
              
              {selectedHistory.data.newFeeds && selectedHistory.data.newFeeds.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  <h4 className="font-semibold text-sm">新增笔记 ({selectedHistory.data.newFeeds.length} 条)</h4>
                  {selectedHistory.data.newFeeds.slice(0, 10).map((feed: FeedSection, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded p-2 bg-gray-50 text-xs">
                      <div className="flex gap-2">
                        {feed.coverImage && (
                          <img 
                            src={feed.coverImage} 
                            alt={feed.title || '封面'} 
                            className="w-12 h-12 object-cover rounded shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          {feed.title && (
                            <div className="font-medium text-gray-800 truncate mb-1">
                              {feed.title}
                            </div>
                          )}
                          {feed.authorName && (
                            <div className="text-gray-600 mb-1">{feed.authorName}</div>
                          )}
                          {feed.likeCount && (
                            <div className="text-gray-500">❤️ {feed.likeCount}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedHistory.data.newFeeds.length > 10 && (
                    <div className="text-xs text-gray-500 text-center">
                      还有 {selectedHistory.data.newFeeds.length - 10} 条笔记...
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => {
                  const json = JSON.stringify(selectedHistory.data, null, 2)
                  navigator.clipboard.writeText(json)
                  alert('数据已复制到剪贴板')
                }}
                className="w-full px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                复制 JSON 数据
              </button>
            </div>
          )}
          
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('确定要删除所有历史记录吗？')) {
                  deleteHistory(history.map(item => item.key))
                }
              }}
              className="w-full px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
            >
              清空所有历史记录
            </button>
          )}
        </div>
      ) : (
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
                
                {/* 用户信息显示（仅在个人主页模式下） */}
                {feedsData.userInfo && (
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
                    <h3 className="font-semibold text-base text-blue-800 mb-2">用户信息</h3>
                    <div className="flex items-start gap-3">
                      {feedsData.userInfo.avatar && (
                        <img 
                          src={feedsData.userInfo.avatar} 
                          alt={feedsData.userInfo.nickname || '用户头像'} 
                          className="w-16 h-16 rounded-full object-cover shrink-0 border-2 border-blue-200"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        {feedsData.userInfo.nickname && (
                          <div className="font-semibold text-sm text-gray-800">
                            {feedsData.userInfo.nickname}
                            {feedsData.userInfo.gender && (
                              <span className="ml-1 text-xs">
                                {feedsData.userInfo.gender === 'male' ? '♂' : '♀'}
                              </span>
                            )}
                          </div>
                        )}
                        {feedsData.userInfo.redId && (
                          <div className="text-xs text-gray-600">
                            小红书号：{feedsData.userInfo.redId}
                          </div>
                        )}
                        {feedsData.userInfo.location && (
                          <div className="text-xs text-gray-600">
                            📍 {feedsData.userInfo.location}
                          </div>
                        )}
                        {feedsData.userInfo.description && (
                          <div className="text-xs text-gray-700 mt-2 whitespace-pre-line line-clamp-3">
                            {feedsData.userInfo.description}
                          </div>
                        )}
                        {feedsData.userInfo.tags && feedsData.userInfo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {feedsData.userInfo.tags.map((tag, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {(feedsData.userInfo.followingCount || feedsData.userInfo.followersCount || feedsData.userInfo.likesAndCollectionsCount) && (
                          <div className="flex gap-4 mt-2 text-xs text-gray-600">
                            {feedsData.userInfo.followingCount && (
                              <span>关注 {feedsData.userInfo.followingCount}</span>
                            )}
                            {feedsData.userInfo.followersCount && (
                              <span>粉丝 {feedsData.userInfo.followersCount}</span>
                            )}
                            {feedsData.userInfo.likesAndCollectionsCount && (
                              <span>获赞 {feedsData.userInfo.likesAndCollectionsCount}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
      )}
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}
