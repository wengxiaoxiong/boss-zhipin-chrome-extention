import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'


export function Popup() {
  const [error, setError] = useState<string | null>(null)
  const [openingSidePanel, setOpeningSidePanel] = useState(false)

  const openSidePanel = async () => {
    setOpeningSidePanel(true)
    setError(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id })
      } else {
        await chrome.sidePanel.open({ tabId: chrome.tabs.TAB_ID_NONE })
      }

      window.close()
    } catch (err) {
      console.error('打开侧边栏失败:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOpeningSidePanel(false)
    }
  }

  return (
    <div className="w-[360px] max-h-[600px] overflow-y-auto p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">BOSS直聘简历收集器</h1>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={openSidePanel}
          disabled={openingSidePanel}
          className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {openingSidePanel ? '打开中...' : '点击开启'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm whitespace-pre-line">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}
