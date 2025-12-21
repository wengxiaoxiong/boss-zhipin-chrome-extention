import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronDown, ChevronUp, RefreshCw, Trash2, User } from 'lucide-react'
import { useResumes } from '@/hooks/useResumes'

export function ResumeListCard() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { resumes, loading, error, fetchResumes, clearResumes } = useResumes()

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (e) {
      return isoString
    }
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <CardTitle>已收集简历</CardTitle>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {resumes.length}
            </span>
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                fetchResumes()
              }}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                clearResumes()
              }}
              disabled={loading || resumes.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {resumes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无已收集的简历
              </div>
            ) : (
              resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{resume.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(resume.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                    已下载
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            提示：这里仅展示收集记录。实际简历文件已下载到您的电脑默认下载目录中。
          </div>
        </CardContent>
      )}
    </Card>
  )
}

