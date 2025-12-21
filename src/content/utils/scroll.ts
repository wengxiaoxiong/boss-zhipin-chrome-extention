/**
 * 滚动相关工具函数
 */

/**
 * 平滑滚动到指定元素
 * @param element 目标元素
 */
export function scrollToElement(element: HTMLElement): void {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

