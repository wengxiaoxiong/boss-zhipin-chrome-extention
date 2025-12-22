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
  keywordConfig?: {
    keyword: string
    message: string
    enabled: boolean
  }
}

export type MessageAction =
  | 'ping'
  | 'getPageInfo'
  | 'startAutoGreet'
  | 'stopAutoGreet'
  | 'getAutoGreetStatus'
  | 'updateKeywordConfig'

export interface MessageRequest {
  action?: MessageAction
  type?: 'START_RESUME_COLLECTOR' | 'STOP_RESUME_COLLECTOR' | 'GET_RESUME_COLLECTOR_STATUS'
  data?: any
}

export interface PageInfo {
  title: string
  url: string
  isInFrame: boolean
}
