import { useState, useEffect, useCallback } from 'react'
import type { ResumeCollectorStatus } from '@/types'

export function useResumeCollector() {
  const [status, setStatus] = useState<ResumeCollectorStatus>({
    isRunning: false,
    isCorrectPage: false,
    processedCount: 0,
    resumeCollectedCount: 0,
    agreedCount: 0,
    requestedCount: 0,
    currentCandidate: null,
    keywordConfig: {
      keyword: '',
      message: '',
      enabled: false,
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 监听来自 content script 的状态更新
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'RESUME_COLLECTOR_STATUS_UPDATE') {
        setStatus(message.data)
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [])

  // 获取初始状态
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'GET_RESUME_COLLECTOR_STATUS' },
          (response) => {
            if (response) {
              setStatus(response)
            }
          }
        )
      }
    })
  }, [])

  const start = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]?.id) {
        throw new Error('无法获取当前标签页')
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'START_RESUME_COLLECTOR',
      })

      if (!response?.success) {
        throw new Error(response?.error || '启动失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const stop = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]?.id) {
        throw new Error('无法获取当前标签页')
      }

      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'STOP_RESUME_COLLECTOR',
      })

      if (!response?.success) {
        throw new Error(response?.error || '停止失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateKeywordConfig = useCallback(async (config: Partial<ResumeCollectorStatus['keywordConfig']>) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]?.id) return

      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateKeywordConfig',
        data: config,
      })
    } catch (err) {
      console.error('更新关键字配置失败:', err)
    }
  }, [])

  const updateDownloadEnabled = useCallback(async (enabled: boolean) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]?.id) return

      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateDownloadEnabled',
        data: enabled,
      })
    } catch (err) {
      console.error('更新下载设置失败:', err)
    }
  }, [])

  return { status, loading, error, start, stop, updateKeywordConfig, updateDownloadEnabled }
}

