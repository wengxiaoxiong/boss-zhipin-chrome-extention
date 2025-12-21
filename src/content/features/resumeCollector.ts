/**
 * 简历收集器功能模块
 */

import { clickWithHighlight, scrollToElementWithHighlight } from '../utils/dom'
import { scrollToElement } from '../utils/scroll'

const isInChatPage = window.location.href.includes('/web/chat/index')

// 简历收集器状态
let isResumeCollecting = false
const processedCandidates = new Set<string>()
const waitingForResumeCandidates = new Set<string>() // 等待简历回复的候选人
let resumeCollectorStats = {
  processedCount: 0,
  resumeCollectedCount: 0,
  agreedCount: 0,
  requestedCount: 0,
  currentCandidate: null as string | null,
}

/**
 * 简历状态枚举
 */
export const ResumeStatus = {
  NO_RESPONSE: 0, // 情况0: 没有回复
  NEED_REQUEST: 1, // 情况1: 需要求简历
  NEED_AGREE: 2, // 情况2: 需要同意
  HAS_RESUME: 3, // 情况3: 已有简历需要预览
  ALREADY_COLLECTED: 4, // 情况4: 已经收集过
} as const

/**
 * 获取候选人列表项
 */
function getCandidateListItems(): HTMLElement[] {
  if (!isInChatPage) return []

  console.log('[Resume Collector] 查找候选人列表...')

  const userContainer = document.querySelector('.user-container')
  if (!userContainer) {
    console.log('[Resume Collector] ❌ 未找到 user-container')
    return []
  }

  const listItems = userContainer.querySelectorAll<HTMLElement>('[role="listitem"]')
  console.log(`[Resume Collector] ✅ 找到 ${listItems.length} 个候选人`)

  return Array.from(listItems)
}

/**
 * 获取候选人ID和名称
 */
function getCandidateInfo(listItem: HTMLElement): { id: string; name: string } | null {
  const nameEl = listItem.querySelector('.geek-name')
  const name = nameEl?.textContent?.trim() || '未知'

  // 尝试从 data-id 或其他属性获取ID
  const geekItem = listItem.querySelector('[data-id]')
  const id = geekItem?.getAttribute('data-id') || `name_${name}`

  return { id, name }
}

/**
 * 点击候选人卡片选中该候选人（带高亮）
 */
async function selectCandidate(listItem: HTMLElement): Promise<boolean> {
  try {
    console.log('[Resume Collector] 点击选中候选人...')

    // 查找可点击的区域（通常是 .geek-item）
    const clickableArea = (listItem.querySelector('.geek-item') || listItem) as HTMLElement

    if (clickableArea) {
      // 滚动并高亮
      await scrollToElementWithHighlight(clickableArea, 2000)
      await new Promise(r => setTimeout(r, 500))

      // 点击并高亮
      const clicked = await clickWithHighlight(clickableArea, 2000)
      if (clicked) {
        await new Promise(r => setTimeout(r, 1500)) // 等待对话框加载
        return true
      }
    }

    return false
  } catch (err) {
    console.error('[Resume Collector] 选中候选人失败:', err)
    return false
  }
}

/**
 * 检查当前对话状态
 */
function checkResumeStatus(): number {
  const messageList = document.querySelector('.chat-message-list')
  if (!messageList) {
    console.log('[Resume Collector] ❌ 未找到消息列表')
    return ResumeStatus.NO_RESPONSE
  }

  const html = messageList.innerHTML

  console.log('[Resume Collector] 检查简历状态...')

  // 情况3: 已有简历（点击预览附件简历）- 优先级最高
  if (html.includes('点击预览附件简历')) {
    console.log('[Resume Collector] ✅ 情况3: 已有简历（找到"点击预览附件简历"）')
    return ResumeStatus.HAS_RESUME
  }

  // 检查是否有"简历请求已发送"提示
  if (html.includes('简历请求已发送')) {
    console.log('[Resume Collector] 📨 发现"简历请求已发送"，等待对方回复...')
    // 继续检查是否已有简历
  }

  // 情况2: 需要同意（对方想发送附件简历给您，您是否同意）
  if (html.includes('对方想发送附件简历给您，您是否同意')) {
    const agreeButtons = messageList.querySelectorAll('.message-card-buttons .card-btn')
    let hasActiveAgree = false

    for (const btn of agreeButtons) {
      const text = btn.textContent?.trim()
      if (text && text.includes('同意') && !btn.classList.contains('disabled')) {
        hasActiveAgree = true
        break
      }
    }

    if (hasActiveAgree) {
      console.log('[Resume Collector] ✅ 情况2: 需要同意（找到可用的"同意"按钮）')
      return ResumeStatus.NEED_AGREE
    } else {
      // 已经同意过了，按钮disabled
      console.log('[Resume Collector] ✅ 情况4: 已同意过（"同意"按钮已禁用）')
      return ResumeStatus.ALREADY_COLLECTED
    }
  }

  // 情况1: 需要求简历（查找"求简历"按钮）
  const requestButton = document.querySelector('.operate-icon-item .operate-btn')
  if (requestButton?.textContent?.includes('求简历')) {
    console.log('[Resume Collector] ✅ 情况1: 需要求简历（找到"求简历"按钮）')
    return ResumeStatus.NEED_REQUEST
  }

  // 情况0: 没有回复或其他情况
  console.log('[Resume Collector] ⚠️ 情况0: 没有回复或无法判断')
  console.log('[Resume Collector] 消息列表内容片段:', html.substring(0, 200))
  return ResumeStatus.NO_RESPONSE
}

/**
 * 情况1: 点击"求简历"（带高亮）
 */
async function clickRequestResume(): Promise<boolean> {
  try {
    const requestButton = document.querySelector<HTMLElement>('.operate-icon-item .operate-btn')
    if (!requestButton || !requestButton.textContent?.includes('求简历')) {
      console.log('[Resume Collector] ❌ 未找到"求简历"按钮')
      return false
    }

    // 点击并高亮
    const clicked = await clickWithHighlight(requestButton, 2000)
    if (!clicked) return false

    await new Promise(r => setTimeout(r, 500))

    // 查找确认按钮
    const confirmButton = document.querySelector<HTMLElement>('.exchange-tooltip .boss-btn-primary')
    if (confirmButton) {
      await clickWithHighlight(confirmButton, 2000)
      console.log('[Resume Collector] ✅ 已点击求简历')
      resumeCollectorStats.requestedCount++
      return true
    }

    return false
  } catch (err) {
    console.error('[Resume Collector] 求简历失败:', err)
    return false
  }
}

/**
 * 情况2: 点击"同意"（带高亮）
 */
async function clickAgreeResume(): Promise<boolean> {
  try {
    const agreeButtons = document.querySelectorAll<HTMLElement>('.message-card-buttons .card-btn')
    let agreeButton: HTMLElement | null = null

    for (const btn of agreeButtons) {
      if (btn.textContent?.includes('同意') && !btn.classList.contains('disabled')) {
        agreeButton = btn
        break
      }
    }

    if (!agreeButton) {
      console.log('[Resume Collector] ❌ 未找到"同意"按钮')
      return false
    }

    await clickWithHighlight(agreeButton, 2000)
    console.log('[Resume Collector] ✅ 已点击同意')
    resumeCollectorStats.agreedCount++
    await new Promise(r => setTimeout(r, 2000)) // 等待简历加载
    return true
  } catch (err) {
    console.error('[Resume Collector] 同意简历失败:', err)
    return false
  }
}

/**
 * 情况3: 点击预览并下载简历（带高亮）
 */
async function previewAndDownloadResume(candidateName: string): Promise<boolean> {
  try {
    // 第一步：查找并点击"点击预览附件简历"按钮
    const allButtons = document.querySelectorAll<HTMLElement>('.message-card-buttons .card-btn')
    let previewButton: HTMLElement | null = null

    for (const btn of allButtons) {
      if (btn.textContent?.includes('点击预览附件简历')) {
        previewButton = btn
        break
      }
    }

    if (!previewButton) {
      console.log('[Resume Collector] ❌ 未找到预览按钮')
      return false
    }

    console.log('[Resume Collector] 找到预览按钮，准备点击...')
    await clickWithHighlight(previewButton, 2000)
    console.log('[Resume Collector] ✅ 已点击预览')

    // 等待预览窗口加载
    await new Promise(r => setTimeout(r, 3000))

    // 第二步：查找并点击下载按钮
    const downloaded = await clickDownloadButton()

    if (downloaded) {
      // 保存简历信息到数据库
      await saveResumeInfo(candidateName)
      resumeCollectorStats.resumeCollectedCount++
      console.log('[Resume Collector] ✅ 简历已下载并保存')
    } else {
      console.log('[Resume Collector] ⚠️ 下载按钮未找到或点击失败')
    }

    // 第三步：关闭预览窗口
    await closePreviewWindow()

    return true
  } catch (err) {
    console.error('[Resume Collector] 预览下载简历失败:', err)
    return false
  }
}

/**
 * 点击下载按钮（带高亮）
 */
async function clickDownloadButton(): Promise<boolean> {
  return new Promise(resolve => {
    console.log('[Resume Collector] 查找下载按钮...')

    function clickTargetButton() {
      // 简化选择器：定位到包裹SVG的可点击父元素（关键！）
      // 处理动态ID：先查找包含 resume-footer-wrap 的对话框
      const dialog = document.querySelector('[id^="boss-dynamic-dialog"]')
      if (!dialog) {
        console.warn('[Resume Collector] 未找到对话框')
        return false
      }

      const targetElement = dialog.querySelector(
        '.resume-footer-wrap div:nth-child(3) > span'
      ) as HTMLElement | null

      // 排查1：元素是否存在
      if (!targetElement) {
        console.warn('[Resume Collector] 目标元素未找到，可能还没加载完成')
        return false
      }

      // 点击并高亮
      clickWithHighlight(targetElement, 2000)
        .then(clicked => {
          if (clicked) {
            console.log('[Resume Collector] ✅ 下载按钮点击成功')
          }
        })
        .catch(err => {
          console.error('[Resume Collector] 点击下载按钮失败:', err)
        })

      return true
    }

    // 等待元素加载：每300ms检查一次，最多等10秒（可调整）
    const checkTimer = setInterval(() => {
      const dialog = document.querySelector('[id^="boss-dynamic-dialog"]')
      if (dialog) {
        const isExist = dialog.querySelector('.resume-footer-wrap div:nth-child(3) > span')
        if (isExist) {
          const clicked = clickTargetButton()
          clearInterval(checkTimer) // 找到元素后停止检查
          resolve(clicked)
        }
      }
    }, 300)

    // 超时保护：10秒后停止检查（避免无限轮询）
    setTimeout(() => {
      clearInterval(checkTimer)
      console.warn('[Resume Collector] 超时未找到目标元素')
      resolve(false)
    }, 10000)
  })
}

/**
 * 关闭预览窗口（带高亮）
 */
async function closePreviewWindow(): Promise<void> {
  try {
    const closeButton = document.querySelector<HTMLElement>('.boss-popup__close')
    if (closeButton) {
      await clickWithHighlight(closeButton, 2000)
      await new Promise(r => setTimeout(r, 500))
      console.log('[Resume Collector] ✅ 已关闭预览窗口')
    } else {
      console.log('[Resume Collector] ⚠️ 未找到关闭按钮')
    }
  } catch (err) {
    console.error('[Resume Collector] 关闭预览窗口失败:', err)
  }
}

/**
 * 保存简历信息到数据库（通过background script）
 */
async function saveResumeInfo(candidateName: string): Promise<void> {
  const timestamp = new Date().toISOString()
  const resumeInfo = {
    name: candidateName,
    timestamp,
    status: 'downloaded',
  }

  try {
    // 发送消息给background script保存到数据库
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_RESUME_TO_DB',
      data: resumeInfo,
    })

    if (response?.success) {
      console.log('[Resume Collector] ✅ 简历信息已保存到数据库')
    } else {
      console.error('[Resume Collector] ❌ 保存失败:', response?.error)
    }
  } catch (err) {
    console.error('[Resume Collector] ❌ 保存简历信息失败:', err)
  }
}

/**
 * 更新状态并通知 sidepanel
 */
function notifyResumeCollectorStatus(): void {
  chrome.runtime.sendMessage({
    type: 'RESUME_COLLECTOR_STATUS_UPDATE',
    data: {
      isRunning: isResumeCollecting,
      isCorrectPage: isInChatPage,
      processedCount: resumeCollectorStats.processedCount,
      resumeCollectedCount: resumeCollectorStats.resumeCollectedCount,
      agreedCount: resumeCollectorStats.agreedCount,
      requestedCount: resumeCollectorStats.requestedCount,
      currentCandidate: resumeCollectorStats.currentCandidate,
    },
  })
}

/**
 * 发送岗位介绍消息（带高亮）
 */
async function sendIntroMessage(): Promise<void> {
  const toolbarLeft = document.querySelector<HTMLElement>(
    '#container > div:nth-child(1) > div > div.chat-box > div.chat-container > div.chat-conversation > div.conversation-box > div.conversation-operate > div.toolbar-box > div.toolbar-box-left > div:nth-child(2) > div'
  )
  if (toolbarLeft) {
    await clickWithHighlight(toolbarLeft, 2000)
    await new Promise(res => setTimeout(res, 500))
  }

  const toolbarLeftThird = document.querySelector<HTMLElement>(
    '#container > div:nth-child(1) > div > div.chat-box > div.chat-container > div.chat-conversation > div.conversation-box > div.conversation-operate > div.toolbar-box > div.toolbar-box-left > div:nth-child(2) > div:nth-child(3) > div > ul > li:nth-child(1)'
  )
  if (toolbarLeftThird) {
    await clickWithHighlight(toolbarLeftThird, 2000)
    await new Promise(res => setTimeout(res, 500))
  }

  const submitContent = document.querySelector<HTMLElement>(
    '#container > div:nth-child(1) > div > div.chat-box > div.chat-container > div.chat-conversation > div.conversation-box > div.conversation-operate > div.conversation-editor > div.submit-content > div'
  )
  if (submitContent) {
    await clickWithHighlight(submitContent, 2000)
    await new Promise(res => setTimeout(res, 500))
  }
}

/**
 * 简历收集主循环
 */
async function resumeCollectorLoop(): Promise<void> {
  console.log('\n[Resume Collector] ========== Loop Start ==========')

  if (!isResumeCollecting) return

  if (!isInChatPage) {
    console.error('[Resume Collector] ❌ 不在聊天页面')
    return
  }

  const candidates = getCandidateListItems()
  console.log(`[Resume Collector] 找到 ${candidates.length} 个候选人`)

  if (candidates.length === 0) {
    console.log('[Resume Collector] 未找到候选人，3秒后重试')
    if (isResumeCollecting) {
      setTimeout(() => resumeCollectorLoop(), 3000)
    }
    return
  }

  for (const candidate of candidates) {
    if (!isResumeCollecting) break

    // 滚动到当前候选人卡片
    scrollToElement(candidate)
    await new Promise(r => setTimeout(r, 800)) // 等待页面滚动动画完成

    const info = getCandidateInfo(candidate)
    if (!info) continue

    console.log(`[Resume Collector] 处理候选人: ${info.name} (${info.id})`)

    // 检查是否已处理过
    if (processedCandidates.has(info.id)) {
      console.log('[Resume Collector] ⏭️ 已处理过，跳过')
      continue
    }

    // 检查是否正在等待回复
    const isWaiting = waitingForResumeCandidates.has(info.id)
    if (isWaiting) {
      console.log('[Resume Collector] ⏳ 正在等待回复，重新检查状态...')
    }

    // 更新当前候选人
    resumeCollectorStats.currentCandidate = info.name
    notifyResumeCollectorStatus()

    // 选中候选人
    const selected = await selectCandidate(candidate)
    if (!selected) {
      console.log('[Resume Collector] ❌ 选中失败，跳过')
      continue
    }

    // 检查简历状态
    const status = checkResumeStatus()

    let processed = false

    if (status === ResumeStatus.NO_RESPONSE) {
      if (isWaiting) {
        console.log('[Resume Collector] ⏳ 仍在等待回复，保持等待状态')
        // 不标记为已处理，下次继续检查
      } else {
        console.log('[Resume Collector] ⏭️ 情况0: 没有回复，跳过')
        processed = true
      }
    } else if (status === ResumeStatus.NEED_REQUEST) {
      console.log('[Resume Collector] 📝 情况1: 求简历')
      // 发岗位介绍消息
      await sendIntroMessage()
      const requested = await clickRequestResume()
      if (requested) {
        // 求简历成功，标记为等待回复
        waitingForResumeCandidates.add(info.id)
        console.log('[Resume Collector] ✅ 求简历成功，等待对方回复...')
        processed = false // 不标记为已处理
      } else {
        processed = true // 失败了就跳过
      }
    } else if (status === ResumeStatus.NEED_AGREE) {
      console.log('[Resume Collector] ✅ 情况2: 同意')
      await clickAgreeResume()
      // 同意后等待简历下载按钮出现
      await new Promise(r => setTimeout(r, 2000))
      const newStatus = checkResumeStatus()
      if (newStatus === ResumeStatus.HAS_RESUME) {
        await previewAndDownloadResume(info.name)
      }
      // 移除等待标记（如果有的话）
      waitingForResumeCandidates.delete(info.id)
      processed = true
    } else if (status === ResumeStatus.HAS_RESUME) {
      console.log('[Resume Collector] 📄 情况3: 预览并下载简历')
      await previewAndDownloadResume(info.name)
      // 移除等待标记（如果有的话）
      waitingForResumeCandidates.delete(info.id)
      processed = true
    } else if (status === ResumeStatus.ALREADY_COLLECTED) {
      console.log('[Resume Collector] ✓ 情况4: 已收集，跳过')
      // 移除等待标记（如果有的话）
      waitingForResumeCandidates.delete(info.id)
      processed = true
    }

    if (processed) {
      processedCandidates.add(info.id)
      resumeCollectorStats.processedCount++
      resumeCollectorStats.currentCandidate = null
      notifyResumeCollectorStatus()
    } else {
      // 未完全处理完，清除当前候选人标记
      resumeCollectorStats.currentCandidate = null
      notifyResumeCollectorStatus()
    }

    // 等待后继续下一个
    await new Promise(r => setTimeout(r, 2000))
  }
  console.log('[Resume Collector] ========== Loop End ==========\n')

  // 继续循环
  if (isResumeCollecting) {
    setTimeout(() => resumeCollectorLoop(), 3000)
  }
}

/**
 * 启动简历收集器
 */
export function startResumeCollector() {
  console.log('[Resume Collector] 🚀 启动请求')

  if (!isInChatPage) {
    return {
      success: false,
      error: '请在聊天页面使用此功能',
    }
  }

  if (isResumeCollecting) {
    return { success: false, error: '已在运行' }
  }

  isResumeCollecting = true
  processedCandidates.clear()
  waitingForResumeCandidates.clear()
  resumeCollectorStats = {
    processedCount: 0,
    resumeCollectedCount: 0,
    agreedCount: 0,
    requestedCount: 0,
    currentCandidate: null,
  }

  console.log('[Resume Collector] ✅ 已启动，2秒后开始')
  notifyResumeCollectorStatus()

  setTimeout(() => {
    resumeCollectorLoop().catch(err => console.error('[Resume Collector] Loop 错误:', err))
  }, 2000)

  return { success: true, data: { message: '已启动' } }
}

/**
 * 停止简历收集器
 */
export function stopResumeCollector() {
  if (!isResumeCollecting) {
    return { success: false, error: '未在运行' }
  }

  isResumeCollecting = false
  resumeCollectorStats.currentCandidate = null
  notifyResumeCollectorStatus()

  console.log('[Resume Collector] 🛑 已停止')
  return {
    success: true,
    data: {
      message: '已停止',
      stats: resumeCollectorStats,
    },
  }
}

/**
 * 获取简历收集器状态
 */
export function getResumeCollectorStatus() {
  return {
    success: true,
    data: {
      isRunning: isResumeCollecting,
      isCorrectPage: isInChatPage,
      processedCount: resumeCollectorStats.processedCount,
      resumeCollectedCount: resumeCollectorStats.resumeCollectedCount,
      agreedCount: resumeCollectorStats.agreedCount,
      requestedCount: resumeCollectorStats.requestedCount,
      currentCandidate: resumeCollectorStats.currentCandidate,
    },
  }
}

