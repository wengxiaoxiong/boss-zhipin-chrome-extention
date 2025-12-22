import { createRoot } from 'react-dom/client'
import '../index.css'
import { useCurrentUrl } from '@/hooks/useCurrentUrl'
import { useAutoGreet } from '@/hooks/useAutoGreet'
import { useResumeCollector } from '@/hooks/useResumeCollector'
import { PageInfoCard } from '@/components/sidepanel/PageInfoCard'
import { AutoGreetCard } from '@/components/sidepanel/AutoGreetCard'
import { ResumeCollectorCard } from '@/components/sidepanel/ResumeCollectorCard'
import { ResumeListCard } from '@/components/sidepanel/ResumeListCard'

export function Sidepanel() {
  const currentUrl = useCurrentUrl()
  const { status, loading, error, start, stop } = useAutoGreet()
  const {
    status: resumeStatus,
    loading: resumeLoading,
    error: resumeError,
    start: resumeStart,
    stop: resumeStop,
    updateKeywordConfig: resumeUpdateKeywordConfig,
    updateDownloadEnabled: resumeUpdateDownloadEnabled,
  } = useResumeCollector()

  return (
    <div className="w-full h-screen overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">BOSS 直聘助手</h1>
        </div>

        <div className="space-y-6">
          <PageInfoCard url={currentUrl} />

          <AutoGreetCard
            status={status}
            loading={loading}
            error={error}
            currentUrl={currentUrl}
            onStart={start}
            onStop={stop}
          />

          <ResumeCollectorCard
            status={resumeStatus}
            loading={resumeLoading}
            error={resumeError}
            currentUrl={currentUrl}
            onStart={resumeStart}
            onStop={resumeStop}
            onUpdateKeywordConfig={resumeUpdateKeywordConfig}
            onUpdateDownloadEnabled={resumeUpdateDownloadEnabled}
          />

          <ResumeListCard />
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Sidepanel />)
}
