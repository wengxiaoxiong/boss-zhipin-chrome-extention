import { Card, CardContent } from '@/components/ui/card'

interface PageInfoCardProps {
  url: string
}

export function PageInfoCard({ url }: PageInfoCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">
          <strong className="text-base text-foreground">当前页面：</strong>
          <div className="mt-2 break-all text-xs bg-muted p-2 rounded">
            {url || '未知'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
