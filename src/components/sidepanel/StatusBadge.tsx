import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  isRunning: boolean
}

export function StatusBadge({ isRunning }: StatusBadgeProps) {
  if (!isRunning) return null

  return (
    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
      运行中
    </Badge>
  )
}
