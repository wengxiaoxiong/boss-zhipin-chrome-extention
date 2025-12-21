

// Content Script - 支持 iframe 版本
console.log('[Content Script] ✅ 加载')
console.log('[Content Script] URL:', window.location.href)
console.log('[Content Script] 在 iframe 中:', window.self !== window.top)

const isInRecommendFrame = window.location.href.includes('/web/frame/recommend')
const isInChatPage = window.location.href.includes('/web/chat/index')

interface MessageRequest {
  action: 'ping' | 'getPageInfo' | 'startAutoGreet' | 'stopAutoGreet' | 'getAutoGreetStatus'
  type?: string
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

let isAutoGreeting = false
const clickedCandidates = new Set<string>()

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

// ==================== 工具函数（仅在 iframe 中使用）====================

function getCandidateCards(): HTMLElement[] {
  if (!isInRecommendFrame) return []
  
  console.log('[Auto Greet] 开始查找候选人卡片...')
  
  // 在 iframe 中查找
  const selectors = [
    'li.card-item',
    'li[class*="card"]',
    'li[class*="geek"]',
    'article[class*="card"]',
    '[data-geekid]'
  ]
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector)
    if (elements.length > 0) {
      console.log(`[Auto Greet] ✅ 使用 "${selector}" 找到 ${elements.length} 个卡片`)
      
      // 如果是通过 data-geekid 找到的，向上找 li 容器
      if (selector === '[data-geekid]') {
        return Array.from(elements).map(el => {
          let parent = el.parentElement
          while (parent && parent.tagName !== 'LI' && parent.tagName !== 'ARTICLE') {
            parent = parent.parentElement
          }
          return parent as HTMLElement
        }).filter(Boolean)
      }
      
      return Array.from(elements)
    }
  }
  
  // 备用策略：通过"打招呼"按钮反向查找
  console.log('[Auto Greet] 尝试通过按钮反向查找...')
  const greetButtons = Array.from(document.querySelectorAll('button'))
    .filter(btn => btn.textContent?.includes('打招呼'))
  
  if (greetButtons.length > 0) {
    console.log(`[Auto Greet] 找到 ${greetButtons.length} 个"打招呼"按钮`)
    const cards = greetButtons.map(btn => {
      let parent = btn.parentElement
      let depth = 0
      while (parent && depth < 8) {
        const tag = parent.tagName.toLowerCase()
        const cls = parent.className.toLowerCase()
        if (tag === 'li' || tag === 'article' || cls.includes('card') || cls.includes('item')) {
          return parent as HTMLElement
        }
        parent = parent.parentElement
        depth++
      }
      return null
    }).filter(Boolean) as HTMLElement[]
    
    return Array.from(new Set(cards))
  }
  
  console.error('[Auto Greet] ❌ 未找到卡片')
  return []
}

function getCandidateId(card: HTMLElement): string | null {
  // 方法1: data-geekid
  const geekEl = card.querySelector('[data-geekid]')
  if (geekEl) {
    const id = geekEl.getAttribute('data-geekid')
    if (id) return id
  }
  
  // 方法2: 从卡片本身
  const cardId = card.getAttribute('data-geekid') || card.getAttribute('data-id')
  if (cardId) return cardId
  
  // 方法3: 从链接提取
  const link = card.querySelector<HTMLAnchorElement>('a[href*="geek"]')
  if (link?.href) {
    const match = link.href.match(/geek[=/](\d+)/)
    if (match) return match[1]
  }
  
  // 方法4: 使用内容作为标识
  const title = card.querySelector('[class*="title"], h3, h4')
  if (title) {
    return `text_${title.textContent?.trim().substring(0, 50)}`
  }
  
  return null
}

function findGreetButton(card: HTMLElement): HTMLButtonElement | null {
  // 方法1: 类名
  const btn = card.querySelector<HTMLButtonElement>('button.btn-greet, button[class*="greet"]')
  if (btn) return btn
  
  // 方法2: 文本内容
  const allBtns = card.querySelectorAll<HTMLButtonElement>('button')
  for (const b of allBtns) {
    if (b.textContent?.includes('打招呼')) {
      return b
    }
  }
  
  return null
}

function scrollToElement(element: HTMLElement) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function clickGreetButton(card: HTMLElement): Promise<boolean> {
  try {
    const btn = findGreetButton(card)
    if (!btn) {
      console.log('[Auto Greet] ❌ 未找到按钮')
      return false
    }
    
    if (btn.disabled) {
      console.log('[Auto Greet] ⚠️ 按钮已禁用')
      return false
    }
    
    const text = btn.textContent?.trim()
    if (text && !text.includes('打招呼')) {
      console.log('[Auto Greet] ⚠️ 按钮文本不匹配:', text)
      return false
    }
    
    scrollToElement(card)
    await new Promise(r => setTimeout(r, 800))
    
    // 多种点击方式
    btn.click()
    setTimeout(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }, 100)
    
    console.log('[Auto Greet] ✅ 已点击')
    return true
  } catch (err) {
    console.error('[Auto Greet] 点击失败:', err)
    return false
  }
}

// ==================== 简历收集器工具函数 ====================

// 获取候选人列表项
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

// 获取候选人ID和名称
function getCandidateInfo(listItem: HTMLElement): { id: string; name: string } | null {
  const nameEl = listItem.querySelector('.geek-name')
  const name = nameEl?.textContent?.trim() || '未知'
  
  // 尝试从 data-id 或其他属性获取ID
  const geekItem = listItem.querySelector('[data-id]')
  const id = geekItem?.getAttribute('data-id') || `name_${name}`
  
  return { id, name }
}

// 点击候选人卡片选中该候选人
async function selectCandidate(listItem: HTMLElement): Promise<boolean> {
  try {
    console.log('[Resume Collector] 点击选中候选人...')
    
    // 查找可点击的区域（通常是 .geek-item）
    const clickableArea = listItem.querySelector('.geek-item') || listItem
    
    if (clickableArea) {
      (clickableArea as HTMLElement).click()
      await new Promise(r => setTimeout(r, 1500)) // 等待对话框加载
      return true
    }
    
    return false
  } catch (err) {
    console.error('[Resume Collector] 选中候选人失败:', err)
    return false
  }
}

// 检查当前对话状态
const ResumeStatus = {
  NO_RESPONSE: 0,      // 情况0: 没有回复
  NEED_REQUEST: 1,     // 情况1: 需要求简历
  NEED_AGREE: 2,       // 情况2: 需要同意
  HAS_RESUME: 3,       // 情况3: 已有简历需要预览
  ALREADY_COLLECTED: 4, // 情况4: 已经收集过
} as const

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

// 情况1: 点击"求简历"
async function clickRequestResume(): Promise<boolean> {
  try {
    const requestButton = document.querySelector<HTMLElement>('.operate-icon-item .operate-btn')
    if (!requestButton || !requestButton.textContent?.includes('求简历')) {
      console.log('[Resume Collector] ❌ 未找到"求简历"按钮')
      return false
    }
    
    requestButton.click()
    await new Promise(r => setTimeout(r, 500))
    
    // 查找确认按钮
    const confirmButton = document.querySelector<HTMLElement>('.exchange-tooltip .boss-btn-primary')
    if (confirmButton) {
      confirmButton.click()
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

// 情况2: 点击"同意"
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
    
    agreeButton.click()
    console.log('[Resume Collector] ✅ 已点击同意')
    resumeCollectorStats.agreedCount++
    await new Promise(r => setTimeout(r, 2000)) // 等待简历加载
    return true
  } catch (err) {
    console.error('[Resume Collector] 同意简历失败:', err)
    return false
  }
}

// 情况3: 点击预览并下载简历
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
    previewButton.click()
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

// 点击下载按钮
async function clickDownloadButton(): Promise<boolean> {
  try {
    console.log('[Resume Collector] 查找下载按钮...')
    
    // 方案1: 通过SVG图标查找
    const downloadIconUse = document.querySelector<SVGUseElement>('use[xlink\\:href="#icon-attacthment-download"]')
    if (downloadIconUse) {
      const iconContent = downloadIconUse.closest('.icon-content') as HTMLElement
      if (iconContent) {
        console.log('[Resume Collector] ✅ 找到下载按钮（方案1）')
        iconContent.click()
        await new Promise(r => setTimeout(r, 1500))
        console.log('[Resume Collector] ✅ 已点击下载')
        return true
      }
    }
    
    // 方案2: 通过class查找
    const iconContents = document.querySelectorAll<HTMLElement>('.icon-content')
    for (const container of iconContents) {
      const svg = container.querySelector('svg.boss-svg')
      const useEl = svg?.querySelector('use')
      const href = useEl?.getAttribute('xlink:href') || useEl?.getAttribute('href')
      
      if (href && href.includes('download')) {
        console.log('[Resume Collector] ✅ 找到下载按钮（方案2）')
        container.click()
        await new Promise(r => setTimeout(r, 1500))
        console.log('[Resume Collector] ✅ 已点击下载')
        return true
      }
    }
    
    // 方案3: 查找包含"下载"文本的按钮或链接
    const allElements = document.querySelectorAll('*')
    for (const el of allElements) {
      const text = el.textContent?.trim()
      if (text === '下载' && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.classList.contains('icon-content'))) {
        console.log('[Resume Collector] ✅ 找到下载按钮（方案3）')
        ;(el as HTMLElement).click()
        await new Promise(r => setTimeout(r, 1500))
        console.log('[Resume Collector] ✅ 已点击下载')
        return true
      }
    }
    
    console.log('[Resume Collector] ❌ 未找到下载按钮')
    return false
  } catch (err) {
    console.error('[Resume Collector] 点击下载按钮失败:', err)
    return false
  }
}

// 关闭预览窗口
async function closePreviewWindow(): Promise<void> {
  try {
    const closeButton = document.querySelector<HTMLElement>('.boss-popup__close')
    if (closeButton) {
      closeButton.click()
      await new Promise(r => setTimeout(r, 500))
      console.log('[Resume Collector] ✅ 已关闭预览窗口')
    } else {
      console.log('[Resume Collector] ⚠️ 未找到关闭按钮')
    }
  } catch (err) {
    console.error('[Resume Collector] 关闭预览窗口失败:', err)
  }
}

// 保存简历信息到数据库（通过background script）
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

// 更新状态并通知 sidepanel
function notifyResumeCollectorStatus() {
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

// ==================== 简历收集主循环 ====================

async function resumeCollectorLoop() {
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

// ==================== 简历收集器控制函数 ====================

function startResumeCollector(): MessageResponse {
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

function stopResumeCollector(): MessageResponse {
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

function getResumeCollectorStatus(): MessageResponse {
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

// ==================== 主循环 ====================

async function autoGreetLoop() {
  console.log('\n[Auto Greet] ========== Loop Start ==========')
  console.log('[Auto Greet] 运行状态:', isAutoGreeting)
  console.log('[Auto Greet] 已点击:', clickedCandidates.size)
  
  if (!isAutoGreeting) return
  
  if (!isInRecommendFrame) {
    console.error('[Auto Greet] ❌ 不在推荐页 iframe 中')
    return
  }
  
  const cards = getCandidateCards()
  console.log(`[Auto Greet] 找到 ${cards.length} 个卡片`)
  
  if (cards.length === 0) {
    console.log('[Auto Greet] 未找到卡片，3秒后重试')
    if (isAutoGreeting) {
      setTimeout(() => autoGreetLoop(), 3000)
    }
    return
  }
  
  let newClicks = 0
  
  for (let i = 0; i < cards.length; i++) {
    if (!isAutoGreeting) break
    
    const card = cards[i]
    const id = getCandidateId(card)
    
    console.log(`[Auto Greet] [${i + 1}/${cards.length}] ID: ${id}`)
    
    if (!id) continue
    if (clickedCandidates.has(id)) {
      console.log('[Auto Greet] 已点击过，跳过')
      continue
    }
    
    const clicked = await clickGreetButton(card)
    if (clicked) {
      clickedCandidates.add(id)
      newClicks++
      console.log(`[Auto Greet] ✅ 成功！总计: ${clickedCandidates.size}`)
      await new Promise(r => setTimeout(r, 5000))
    }
  }
  
  console.log(`[Auto Greet] 本轮: +${newClicks}, 总计: ${clickedCandidates.size}`)
  console.log('[Auto Greet] ========== Loop End ==========\n')
  
  // 滚动加载更多
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  
  if (isAutoGreeting) {
    setTimeout(() => autoGreetLoop(), 3000)
  }
}

// ==================== 控制函数 ====================

function startAutoGreet(): MessageResponse {
  console.log('[Auto Greet] 🚀 启动请求')
  console.log('[Auto Greet] 当前 URL:', window.location.href)
  console.log('[Auto Greet] 在推荐页 iframe:', isInRecommendFrame)
  
  if (!isInRecommendFrame) {
    return {
      success: false,
      error: '请在推荐页面使用此功能'
    }
  }
  
  if (isAutoGreeting) {
    return { success: false, error: '已在运行' }
  }
  
  isAutoGreeting = true
  clickedCandidates.clear()
  
  console.log('[Auto Greet] ✅ 已启动，2秒后开始')
  setTimeout(() => {
    autoGreetLoop().catch(err => console.error('[Auto Greet] Loop 错误:', err))
  }, 2000)
  
  return { success: true, data: { message: '已启动' } }
}

function stopAutoGreet(): MessageResponse {
  if (!isAutoGreeting) {
    return { success: false, error: '未在运行' }
  }
  isAutoGreeting = false
  console.log('[Auto Greet] 🛑 已停止')
  return { success: true, data: { message: '已停止', clickedCount: clickedCandidates.size } }
}

function getAutoGreetStatus(): MessageResponse {
  return {
    success: true,
    data: {
      isRunning: isAutoGreeting,
      clickedCount: clickedCandidates.size,
      isCorrectPage: isInRecommendFrame
    }
  }
}

// ==================== 消息监听 ====================

chrome.runtime.onMessage.addListener((
  request: MessageRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void
) => {
  console.log('[Content Script] 📨 收到:', request.action || request.type)
  
  if (request.action === 'ping') {
    sendResponse({ success: true, data: { isInFrame: isInRecommendFrame } })
    return true
  }
  
  if (request.action === 'getPageInfo') {
    sendResponse({
      success: true,
      data: { title: document.title, url: window.location.href, isInFrame: isInRecommendFrame }
    })
    return true
  }
  
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
  
  sendResponse({ success: false, error: `未知 action: ${request.action || request.type}` })
  return true
})
