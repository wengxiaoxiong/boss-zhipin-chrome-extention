/**
 * 自动打招呼功能模块
 */

import { clickWithHighlight, scrollToElementWithHighlight } from '../utils/dom'
import { PageType, checkPageType, validatePageType } from '../utils/pageCheck'
import { toastError, toastSuccess } from '../utils/toast'

/**
 * 动态检查是否在推荐页面
 */
function isInRecommendFrame(): boolean {
  return checkPageType(PageType.RECOMMEND)
}

let isAutoGreeting = false
const clickedCandidates = new Set<string>()

/**
 * 获取候选人卡片列表
 */
export function getCandidateCards(): HTMLElement[] {
  if (!isInRecommendFrame()) return []

  console.log('[Auto Greet] 开始查找候选人卡片...')

  // 在 iframe 中查找
  const selectors = [
    'li.card-item',
    'li[class*="card"]',
    'li[class*="geek"]',
    'article[class*="card"]',
    '[data-geekid]',
  ]

  for (const selector of selectors) {
    const elements = document.querySelectorAll<HTMLElement>(selector)
    if (elements.length > 0) {
      console.log(`[Auto Greet] ✅ 使用 "${selector}" 找到 ${elements.length} 个卡片`)

      // 如果是通过 data-geekid 找到的，向上找 li 容器
      if (selector === '[data-geekid]') {
        return Array.from(elements)
          .map(el => {
            let parent = el.parentElement
            while (parent && parent.tagName !== 'LI' && parent.tagName !== 'ARTICLE') {
              parent = parent.parentElement
            }
            return parent as HTMLElement
          })
          .filter(Boolean)
      }

      return Array.from(elements)
    }
  }

  // 备用策略：通过"打招呼"按钮反向查找
  console.log('[Auto Greet] 尝试通过按钮反向查找...')
  const greetButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
    btn.textContent?.includes('打招呼')
  )

  if (greetButtons.length > 0) {
    console.log(`[Auto Greet] 找到 ${greetButtons.length} 个"打招呼"按钮`)
    const cards = greetButtons
      .map(btn => {
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
      })
      .filter(Boolean) as HTMLElement[]

    return Array.from(new Set(cards))
  }

  console.error('[Auto Greet] ❌ 未找到卡片')
  return []
}

/**
 * 获取候选人ID
 */
export function getCandidateId(card: HTMLElement): string | null {
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

/**
 * 查找打招呼按钮
 */
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

/**
 * 点击打招呼按钮（带高亮）
 */
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

    // 滚动到卡片并高亮
    await scrollToElementWithHighlight(card, 2000)
    await new Promise(r => setTimeout(r, 500))

    // 点击按钮并高亮
    const clicked = await clickWithHighlight(btn, 2000)

    if (clicked) {
      console.log('[Auto Greet] ✅ 已点击')
      return true
    }

    return false
  } catch (err) {
    console.error('[Auto Greet] 点击失败:', err)
    return false
  }
}

/**
 * 自动打招呼主循环
 */
async function autoGreetLoop(): Promise<void> {
  console.log('\n[Auto Greet] ========== Loop Start ==========')
  console.log('[Auto Greet] 运行状态:', isAutoGreeting)
  console.log('[Auto Greet] 已点击:', clickedCandidates.size)

  if (!isAutoGreeting) return

  if (!isInRecommendFrame()) {
    console.error('[Auto Greet] ❌ 不在推荐页 iframe 中')
    // 如果不在推荐页面，等待页面切换
    if (isAutoGreeting) {
      setTimeout(() => autoGreetLoop(), 3000)
    }
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

/**
 * 启动自动打招呼
 */
export function startAutoGreet() {
  console.log('[Auto Greet] 🚀 启动请求')
  console.log('[Auto Greet] 当前 URL:', window.location.href)
  console.log('[Auto Greet] 在推荐页 iframe:', isInRecommendFrame())

  // 验证页面类型
  const pageValidation = validatePageType(PageType.RECOMMEND)
  if (!pageValidation.success) {
    toastError(pageValidation.error || '页面验证失败')
    return {
      success: false,
      error: pageValidation.error,
    }
  }

  if (isAutoGreeting) {
    toastError('自动打招呼已在运行')
    return { success: false, error: '已在运行' }
  }

  isAutoGreeting = true
  clickedCandidates.clear()

  console.log('[Auto Greet] ✅ 已启动，2秒后开始')
  toastSuccess('自动打招呼已启动')
  setTimeout(() => {
    autoGreetLoop().catch(err => {
      console.error('[Auto Greet] Loop 错误:', err)
      toastError('自动打招呼运行出错')
    })
  }, 2000)

  return { success: true, data: { message: '已启动' } }
}

/**
 * 停止自动打招呼
 */
export function stopAutoGreet() {
  if (!isAutoGreeting) {
    toastError('自动打招呼未在运行')
    return { success: false, error: '未在运行' }
  }
  isAutoGreeting = false
  console.log('[Auto Greet] 🛑 已停止')
  toastSuccess('自动打招呼已停止')
  return { success: true, data: { message: '已停止', clickedCount: clickedCandidates.size } }
}

/**
 * 获取自动打招呼状态
 */
export function getAutoGreetStatus() {
  return {
    success: true,
    data: {
      isRunning: isAutoGreeting,
      clickedCount: clickedCandidates.size,
      isCorrectPage: isInRecommendFrame(),
    },
  }
}

