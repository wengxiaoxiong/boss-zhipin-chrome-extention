import { useState, useEffect, useCallback } from 'react'

export interface Resume {
  id: number
  name: string
  timestamp: string
  status: string
}

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResumes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_RESUMES' })
      if (response.success) {
        // 按时间倒序排序
        const sortedResumes = (response.data || []).sort(
          (a: Resume, b: Resume) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setResumes(sortedResumes)
      } else {
        throw new Error(response.error || '获取简历失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取简历失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResumes = useCallback(async () => {
    if (!confirm('确定要清空所有已收集的简历记录吗？')) return
    
    setLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_RESUMES' })
      if (response.success) {
        setResumes([])
      } else {
        throw new Error(response.error || '清空失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  return { resumes, loading, error, fetchResumes, clearResumes }
}

