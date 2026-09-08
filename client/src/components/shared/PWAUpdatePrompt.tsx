import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

export function PWAUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error: Error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 max-w-sm flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
            {needRefresh ? <RefreshCw className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              {needRefresh ? 'Update Available' : 'App Ready Offline'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {needRefresh 
                ? 'A new version of the app is available. Update now to get the latest features.'
                : 'The app has been installed and is ready to work offline.'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 justify-end mt-1">
          <Button variant="outline" size="sm" onClick={close} className="text-xs h-8 border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300">
            Close
          </Button>
          {needRefresh && (
            <Button size="sm" onClick={() => updateServiceWorker(true)} className="text-xs h-8 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-900/20">
              Update App
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
