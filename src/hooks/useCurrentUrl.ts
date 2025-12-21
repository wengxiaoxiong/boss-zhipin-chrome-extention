import { useState, useEffect } from 'react'

/**
 * Hook: 获取并监听当前标签页 URL
 */
export function useCurrentUrl() {
  const [currentUrl, setCurrentUrl] = useState<string>('')

  useEffect(() => {
    // 初始化时获取当前标签页 URL
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setCurrentUrl(tab.url || '')
    })

    // 可以添加监听器监听 URL 变化
    const handleTabUpdate = (
      _tabId: number,
      _changeInfo: { url?: string },
      tab: chrome.tabs.Tab
    ) => {
      if (tab.active) {
        setCurrentUrl(tab.url || '')
      }
    }

    chrome.tabs.onUpdated.addListener(handleTabUpdate)

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate)
    }
  }, [])

  return currentUrl
}
