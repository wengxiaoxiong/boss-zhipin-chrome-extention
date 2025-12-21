/**
 * 消息处理模块
 */

import type { MessageRequest, MessageResponse } from '@/types'
import {
  startAutoGreet,
  stopAutoGreet,
  getAutoGreetStatus,
} from './features/autoGreet'
import {
  startResumeCollector,
  stopResumeCollector,
  getResumeCollectorStatus,
} from './features/resumeCollector'
import { PageType, checkPageType } from './utils/pageCheck'

/**
 * 处理来自 background/popup/sidepanel 的消息
 */
export function handleMessage(
  request: MessageRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
): boolean {
  // console.log('[Content Script] 📨 收到:', request.action || request.type)

  if (request.action === 'ping') {
    sendResponse({ success: true, data: { isInFrame: checkPageType(PageType.RECOMMEND) } })
    return true
  }

  if (request.action === 'getPageInfo') {
    sendResponse({
      success: true,
      data: {
        title: document.title,
        url: window.location.href,
        isInFrame: checkPageType(PageType.RECOMMEND),
      },
    })
    return true
  }

  // 自动打招呼相关消息
  if (request.action === 'startAutoGreet') {
    sendResponse(startAutoGreet())
    return true
  }

  if (request.action === 'stopAutoGreet') {
    sendResponse(stopAutoGreet())
    return true
  }

  if (request.action === 'getAutoGreetStatus') {
    sendResponse(getAutoGreetStatus())
    return true
  }

  // 简历收集器消息处理
  if (request.type === 'START_RESUME_COLLECTOR') {
    sendResponse(startResumeCollector())
    return true
  }

  if (request.type === 'STOP_RESUME_COLLECTOR') {
    sendResponse(stopResumeCollector())
    return true
  }

  if (request.type === 'GET_RESUME_COLLECTOR_STATUS') {
    sendResponse(getResumeCollectorStatus())
    return true
  }

  sendResponse({
    success: false,
    error: `未知 action: ${request.action || request.type}`,
  })
  return true
}

