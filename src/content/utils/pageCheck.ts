/**
 * 页面检查工具函数
 */

/**
 * 页面类型常量
 */
export const PageType = {
  CHAT: 'chat', // 聊天页面
  RECOMMEND: 'recommend', // 推荐页面
  OTHER: 'other', // 其他页面
} as const

/**
 * 页面类型
 */
export type PageTypeValue = typeof PageType[keyof typeof PageType]

/**
 * 页面检查配置
 */
export interface PageCheckConfig {
  type: PageTypeValue
  urlPattern: string | RegExp
  errorMessage: string
}

/**
 * 页面检查配置列表
 */
const PAGE_CONFIGS: PageCheckConfig[] = [
  {
    type: PageType.CHAT,
    urlPattern: '/web/chat/index',
    errorMessage: '请在聊天页面使用此功能',
  },
  {
    type: PageType.RECOMMEND,
    urlPattern: '/web/frame/recommend',
    errorMessage: '请在推荐页面使用此功能',
  },
]

/**
 * 检查当前页面是否匹配指定类型
 * @param pageType 页面类型
 * @returns 是否匹配
 */
export function checkPageType(pageType: PageTypeValue): boolean {
  const config = PAGE_CONFIGS.find(c => c.type === pageType)
  if (!config) return false

  const url = window.location.href
  if (typeof config.urlPattern === 'string') {
    return url.includes(config.urlPattern)
  }
  return config.urlPattern.test(url)
}

/**
 * 验证页面类型，如果不匹配则返回错误信息
 * @param pageType 页面类型
 * @returns 验证结果，success 为 true 表示通过，error 为错误信息
 */
export function validatePageType(pageType: PageTypeValue): {
  success: boolean
  error?: string
} {
  const config = PAGE_CONFIGS.find(c => c.type === pageType)
  if (!config) {
    return {
      success: false,
      error: `未知的页面类型: ${pageType}`,
    }
  }

  const isValid = checkPageType(pageType)
  if (!isValid) {
    return {
      success: false,
      error: config.errorMessage,
    }
  }

  return { success: true }
}

/**
 * 获取当前页面类型
 * @returns 当前页面类型
 */
export function getCurrentPageType(): PageTypeValue {
  for (const config of PAGE_CONFIGS) {
    if (checkPageType(config.type)) {
      return config.type
    }
  }
  return PageType.OTHER
}

