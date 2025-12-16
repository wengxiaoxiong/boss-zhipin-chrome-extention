// Content Script 类型定义

export interface ContentMessageRequest {
  action: 'ping' | 'getPageInfo'
}

export interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}
