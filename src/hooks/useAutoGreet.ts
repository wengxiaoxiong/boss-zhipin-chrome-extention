import { useState, useEffect, useCallback } from 'react'
import type { AutoGreetStatus } from '@/types'
import * as chromeService from '@/services/chromeService'

/**
 * Hook: 管理自动打招呼功能的状态和操作
 */
export function useAutoGreet() {
  const [status, setStatus] = useState<AutoGreetStatus>({
    isRunning: false,
    clickedCount: 0,
    isCorrectPage: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取状态
  const fetchStatus = useCallback(async () => {
    try {
      const statusData = await chromeService.getAutoGreetStatus()
      if (statusData) {
        setStatus(statusData)
      }
    } catch (err) {
      console.error('获取自动打招呼状态失败:', err)
    }
  }, [])

  // 启动自动打招呼
  const start = useCallback(async () => {
    console.log('[useAutoGreet] 用户点击开始按钮')
    setLoading(true)
    setError(null)

    try {
      const response = await chromeService.startAutoGreet()

      if (response.success) {
        console.log('[useAutoGreet] 启动成功')
        await fetchStatus()
      } else {
        throw new Error(response.error || '启动失败')
      }
    } catch (err) {
      console.error('[useAutoGreet] 启动自动打招呼失败:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [fetchStatus])

  // 停止自动打招呼
  const stop = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await chromeService.stopAutoGreet()

      if (response.success) {
        await fetchStatus()
      } else {
        throw new Error(response.error || '停止失败')
      }
    } catch (err) {
      console.error('停止自动打招呼失败:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [fetchStatus])

  // 定期更新状态
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  return {
    status,
    loading,
    error,
    start,
    stop,
  }
}
