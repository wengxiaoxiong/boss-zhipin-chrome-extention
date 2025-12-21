import type { ResumeCollectorStatus } from '@/types'
import { useState, useEffect, useRef, startTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from './StatusBadge'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ResumeCollectorCardProps {
  status: ResumeCollectorStatus
  loading: boolean
  error: string | null
  currentUrl: string
  onStart: () => void
  onStop: () => void
}

export function ResumeCollectorCard({
  status,
  loading,
  error,
  currentUrl,
  onStart,
  onStop,
}: ResumeCollectorCardProps) {
  // 如果在聊天页面，默认展开；否则默认收缩
  const [isExpanded, setIsExpanded] = useState(() => status.isCorrectPage)
  const hasAutoExpandedRef = useRef(status.isCorrectPage)

  // 同步状态：当页面状态变化时，如果在聊天页面则展开（仅一次）
  useEffect(() => {
    if (status.isCorrectPage && !hasAutoExpandedRef.current) {
      hasAutoExpandedRef.current = true
      startTransition(() => {
        setIsExpanded(true)
      })
    } else if (!status.isCorrectPage) {
      hasAutoExpandedRef.current = false
    }
  }, [status.isCorrectPage])

  // 打开聊天页面
  const handleOpenChatPage = () => {
    chrome.tabs.create({
      url: 'https://www.zhipin.com/web/chat/index',
    })
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <CardTitle>简历收集器</CardTitle>
            <StatusBadge isRunning={status.isRunning} />
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {!status.isCorrectPage && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                <div>提示：此功能适用于 BOSS 直聘聊天页面</div>
                <div className="text-xs mt-1">
                  (https://www.zhipin.com/web/chat/index)
                </div>
                <div className="mt-1 text-xs">当前页面: {currentUrl}</div>
                <Button
                  onClick={handleOpenChatPage}
                  size="sm"
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  打开聊天页面
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">状态</div>
              <div className="text-lg font-semibold">
                {status.isRunning ? '运行中' : '已停止'}
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">已处理候选人</div>
              <div className="text-lg font-semibold">{status.processedCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600">已获得简历</div>
              <div className="text-base font-semibold text-blue-800">
                {status.resumeCollectedCount}
              </div>
            </div>
            <div className="bg-green-50 p-2 rounded-lg border border-green-200">
              <div className="text-xs text-green-600">已同意</div>
              <div className="text-base font-semibold text-green-800">
                {status.agreedCount}
              </div>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
              <div className="text-xs text-purple-600">已求简历</div>
              <div className="text-base font-semibold text-purple-800">
                {status.requestedCount}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onStart}
              disabled={loading || status.isRunning}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {loading ? '启动中...' : '开始收集'}
            </Button>
            <Button
              onClick={onStop}
              disabled={loading || !status.isRunning}
              variant="destructive"
              className="flex-1"
            >
              {loading ? '停止中...' : '停止'}
            </Button>
          </div>

          {status.currentCandidate && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 mb-1">当前处理</div>
              <div className="text-sm font-medium">{status.currentCandidate}</div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>功能说明：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>自动遍历每个候选人并收集简历</li>
              <li>情况1：没有简历，自动点击"求简历"</li>
              <li>情况2：对方要发简历，自动点击"同意"</li>
              <li>情况3：已有简历，自动预览并保存</li>
              <li>情况4：已处理过的候选人会跳过</li>
              <li>每处理一个候选人等待2秒后继续</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

