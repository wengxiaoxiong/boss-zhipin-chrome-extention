/**
 * DOM 操作工具函数
 */

/**
 * 高亮元素样式配置
 */
interface HighlightStyle {
  borderColor: string
  borderWidth: string
  backgroundColor: string
  boxShadow: string
  transition: string
}

const DEFAULT_HIGHLIGHT_STYLE: HighlightStyle = {
  borderColor: '#ff4444',
  borderWidth: '3px',
  backgroundColor: 'rgba(255, 68, 68, 0.1)',
  boxShadow: '0 0 10px rgba(255, 68, 68, 0.5)',
  transition: 'all 0.3s ease',
}

/**
 * 存储原始样式，用于恢复
 */
const originalStyles = new WeakMap<HTMLElement, Partial<CSSStyleDeclaration>>()

/**
 * 给指定DOM元素画高亮框
 * @param el DOM元素
 * @param style 可选的自定义样式
 * @param duration 高亮持续时间（毫秒），默认 2000ms
 */
export function highlightElement(
  el: HTMLElement,
  style?: Partial<HighlightStyle>,
  duration: number = 2000
): void {
  if (!el) return

  // 保存原始样式
  if (!originalStyles.has(el)) {
    originalStyles.set(el, {
      border: el.style.border,
      backgroundColor: el.style.backgroundColor,
      boxShadow: el.style.boxShadow,
      transition: el.style.transition,
    })
  }

  // 应用高亮样式
  const highlightStyle = { ...DEFAULT_HIGHLIGHT_STYLE, ...style }
  el.style.border = `${highlightStyle.borderWidth} solid ${highlightStyle.borderColor}`
  el.style.backgroundColor = highlightStyle.backgroundColor
  el.style.boxShadow = highlightStyle.boxShadow
  el.style.transition = highlightStyle.transition
  el.style.borderRadius = '4px'
  el.style.zIndex = '9999'
  el.style.position = 'relative'

  // 自动移除高亮
  if (duration > 0) {
    setTimeout(() => {
      removeHighlight(el)
    }, duration)
  }
}

/**
 * 清除元素的高亮框
 * @param el DOM元素
 */
export function removeHighlight(el: HTMLElement): void {
  if (!el) return

  const original = originalStyles.get(el)
  if (original) {
    el.style.border = original.border || ''
    el.style.backgroundColor = original.backgroundColor || ''
    el.style.boxShadow = original.boxShadow || ''
    el.style.transition = original.transition || ''
    el.style.borderRadius = ''
    el.style.zIndex = ''
    el.style.position = ''
    originalStyles.delete(el)
  } else {
    // 如果没有保存原始样式，直接清除
    el.style.border = ''
    el.style.backgroundColor = ''
    el.style.boxShadow = ''
    el.style.transition = ''
    el.style.borderRadius = ''
    el.style.zIndex = ''
    el.style.position = ''
  }
}

/**
 * 带高亮的点击操作
 * @param element 要点击的元素
 * @param highlightDuration 高亮持续时间，默认 2000ms
 * @returns 是否点击成功
 */
export async function clickWithHighlight(
  element: HTMLElement | null,
  highlightDuration: number = 2000
): Promise<boolean> {
  if (!element) return false

  try {
    // 先高亮
    highlightElement(element, undefined, highlightDuration)

    // 等待一小段时间让用户看到高亮
    await new Promise(resolve => setTimeout(resolve, 300))

    // 执行点击
    element.click()
    
    // 同时触发鼠标事件以确保兼容性
    setTimeout(() => {
      element.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      )
    }, 100)

    return true
  } catch (err) {
    console.error('[DOM Utils] 点击失败:', err)
    removeHighlight(element)
    return false
  }
}

/**
 * 滚动到元素并高亮
 * @param element 目标元素
 * @param highlightDuration 高亮持续时间
 */
export async function scrollToElementWithHighlight(
  element: HTMLElement,
  highlightDuration: number = 2000
): Promise<void> {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await new Promise(resolve => setTimeout(resolve, 800))
  highlightElement(element, undefined, highlightDuration)
}

