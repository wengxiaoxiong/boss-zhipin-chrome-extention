/**
 * Toast 通知工具函数（用于 content script）
 * 在页面上创建简单的 toast 通知
 */

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Toast 配置
 */
interface ToastOptions {
  type?: ToastType
  duration?: number // 持续时间（毫秒），默认 3000
  position?: 'top' | 'bottom' // 位置，默认 top
}

/**
 * 创建 toast 容器（如果不存在）
 */
function getOrCreateToastContainer(): HTMLElement {
  let container = document.getElementById('boss-extension-toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'boss-extension-toast-container'
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    `
    document.body.appendChild(container)
  }
  return container
}

/**
 * 显示 toast 通知
 * @param message 消息内容
 * @param options 配置选项
 */
export function toast(message: string, options: ToastOptions = {}): void {
  const {
    type = 'info',
    duration = 3000,
    position = 'top',
  } = options

  const container = getOrCreateToastContainer()
  
  // 创建 toast 元素
  const toastEl = document.createElement('div')
  toastEl.className = `boss-extension-toast boss-extension-toast-${type}`
  
  // 根据类型设置样式
  const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: {
      bg: '#10b981',
      border: '#059669',
      icon: '✓',
    },
    error: {
      bg: '#ef4444',
      border: '#dc2626',
      icon: '✕',
    },
    warning: {
      bg: '#f59e0b',
      border: '#d97706',
      icon: '⚠',
    },
    info: {
      bg: '#3b82f6',
      border: '#2563eb',
      icon: 'ℹ',
    },
  }

  const style = typeStyles[type]
  
  toastEl.style.cssText = `
    background-color: ${style.bg};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid ${style.border};
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    animation: slideIn 0.3s ease-out;
    max-width: 100%;
    word-wrap: break-word;
  `

  // 添加动画样式（如果还没有）
  if (!document.getElementById('boss-extension-toast-styles')) {
    const styleEl = document.createElement('style')
    styleEl.id = 'boss-extension-toast-styles'
    styleEl.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(styleEl)
  }

  // 创建图标
  const iconEl = document.createElement('span')
  iconEl.textContent = style.icon
  iconEl.style.cssText = `
    font-weight: bold;
    font-size: 16px;
    flex-shrink: 0;
  `

  // 创建消息文本
  const messageEl = document.createElement('span')
  messageEl.textContent = message
  messageEl.style.cssText = `
    flex: 1;
    line-height: 1.5;
  `

  toastEl.appendChild(iconEl)
  toastEl.appendChild(messageEl)

  // 设置容器位置
  if (position === 'bottom') {
    container.style.top = 'auto'
    container.style.bottom = '20px'
  } else {
    container.style.top = '20px'
    container.style.bottom = 'auto'
  }

  // 添加到容器
  container.appendChild(toastEl)

  // 自动移除
  const removeToast = () => {
    toastEl.style.animation = 'slideOut 0.3s ease-out'
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl)
      }
      // 如果容器为空，移除容器
      if (container.children.length === 0) {
        container.remove()
      }
    }, 300)
  }

  setTimeout(removeToast, duration)

  // 点击关闭
  toastEl.addEventListener('click', removeToast)
}

/**
 * 成功提示
 */
export function toastSuccess(message: string, duration?: number): void {
  toast(message, { type: 'success', duration })
}

/**
 * 错误提示
 */
export function toastError(message: string, duration?: number): void {
  toast(message, { type: 'error', duration: duration || 5000 })
}

/**
 * 信息提示
 */
export function toastInfo(message: string, duration?: number): void {
  toast(message, { type: 'info', duration })
}

/**
 * 警告提示
 */
export function toastWarning(message: string, duration?: number): void {
  toast(message, { type: 'warning', duration })
}

