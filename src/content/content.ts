

// Content Script - 支持 iframe 版本
console.log('[Content Script] ✅ 加载')
console.log('[Content Script] URL:', window.location.href)
console.log('[Content Script] 在 iframe 中:', window.self !== window.top)

const isInRecommendFrame = window.location.href.includes('/web/frame/recommend')

interface MessageRequest {
  action: 'ping' | 'getPageInfo' | 'startAutoGreet' | 'stopAutoGreet' | 'getAutoGreetStatus'
}

interface MessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

let isAutoGreeting = false
const clickedCandidates = new Set<string>()

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
  console.log('[Content Script] 📨 收到:', request.action)
  
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
  
  sendResponse({ success: false, error: `未知 action: ${request.action}` })
  return true
})
