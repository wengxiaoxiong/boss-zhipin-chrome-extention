import type { AutoGreetStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatusBadge } from './StatusBadge'

interface AutoGreetCardProps {
  status: AutoGreetStatus
  loading: boolean
  error: string | null
  currentUrl: string
  onStart: () => void
  onStop: () => void
}

export function AutoGreetCard({
  status,
  loading,
  error,
  currentUrl,
  onStart,
  onStop,
}: AutoGreetCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>自动打招呼</CardTitle>
          <StatusBadge isRunning={status.isRunning} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!status.isCorrectPage && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-yellow-800">
              <div>提示：此功能适用于 BOSS 直聘推荐页面</div>
              <div className="text-xs mt-1">
                (https://www.zhipin.com/web/chat/recommend)
              </div>
              <div className="mt-1 text-xs">当前页面: {currentUrl}</div>
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
            <div className="text-xs text-muted-foreground">已点击数</div>
            <div className="text-lg font-semibold">{status.clickedCount}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onStart}
            disabled={loading || status.isRunning}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            {loading ? '启动中...' : '开始'}
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

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>功能说明：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>自动扫描候选人卡片并点击"打招呼"按钮</li>
            <li>每个候选人点击后等待5秒再继续</li>
            <li>自动记录已点击的候选人，避免重复</li>
            <li>自动滚动页面加载更多候选人</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
