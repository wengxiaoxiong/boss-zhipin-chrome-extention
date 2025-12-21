// 共享类型定义

export interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

export interface AutoGreetStatus {
  isRunning: boolean
  clickedCount: number
  isCorrectPage: boolean
}

export interface ResumeCollectorStatus {
  isRunning: boolean
  isCorrectPage: boolean
  processedCount: number
  resumeCollectedCount: number
  agreedCount: number
  requestedCount: number
  currentCandidate: string | null
}

export type MessageAction =
  | 'ping'
  | 'getPageInfo'
  | 'startAutoGreet'
  | 'stopAutoGreet'
  | 'getAutoGreetStatus'

export interface MessageRequest {
  action: MessageAction
}

export interface PageInfo {
  title: string
  url: string
  isInFrame: boolean
}
