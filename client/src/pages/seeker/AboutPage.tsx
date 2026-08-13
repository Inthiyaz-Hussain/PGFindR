import { AboutContent } from '@/components/shared/AboutContent'
import { useAuth } from '@/hooks/useAuth'
import { Hourglass } from 'lucide-react'

export function AboutPage() {
  const { profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const isPending = isOwner && !profile?.onboarding_verified

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {isPending && (
        <div className="p-6 rounded-2xl border border-amber-200/80 bg-amber-50/55 dark:border-amber-900/30 dark:bg-amber-950/20 backdrop-blur-md shadow-lg flex flex-col md:flex-row items-start gap-4 animate-pulse">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <Hourglass className="size-6 shrink-0" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-300">Portal Access Pending Admin Approval</h2>
            <p className="text-sm text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
              Welcome, <span className="font-bold text-slate-900 dark:text-slate-100">{profile?.full_name || 'Owner'}</span>! Your registration details for <span className="font-semibold text-slate-900 dark:text-slate-100">{profile?.phone || 'your phone number'}</span> have been successfully recorded.
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-500/85">
              An administrator needs to verify your profile before you can access the dashboard, list PGs, manage tenants, and edit information. Please check back shortly.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">About FindPgR</h1>
        <p className="text-muted-foreground mt-1">Learn more about our platform, mission, and how we help you find the perfect stay.</p>
      </div>
      <AboutContent />
    </div>
  )
}
export default AboutPage
