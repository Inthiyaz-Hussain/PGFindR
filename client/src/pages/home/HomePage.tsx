import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Compass, ShieldCheck, LogIn, UserPlus, ArrowRight } from 'lucide-react'

import { SplashScreen } from '@/components/home/SplashScreen'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function HomePage() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('pgr_splash_dismissed') !== 'true'
  })

  // Auto-redirect logged-in users to their respective portals
  useEffect(() => {
    if (!loading && user && profile) {
      const role = profile.role
      const dashboard = role === 'owner' ? '/owner' : role === 'admin' ? '/admin' : '/seeker'
      navigate(dashboard, { replace: true })
    }
  }, [user, profile, loading, navigate])

  function handleSplashDismiss() {
    setShowSplash(false)
    sessionStorage.setItem('pgr_splash_dismissed', 'true')
    window.dispatchEvent(new CustomEvent('splash-dismissed'))
  }

  if (showSplash) {
    return <SplashScreen onDismiss={handleSplashDismiss} />
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-16 px-4 overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse duration-4000" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse duration-6000" />

      <div className="relative max-w-5xl w-full text-center space-y-12">
        {/* Header Section */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            ✨ Welcome to SwiftPG
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Choose Your Portal to Get Started
          </h1>
          <p className="text-base md:text-lg text-slate-400 leading-relaxed">
            Whether you are searching for a premium verified PG, listing your properties, or administering the platform, select your gateway below.
          </p>
        </div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8">
          {/* Card 1: Seeker */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all duration-300">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Seeker / Tenant</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Find and book verified premium PG accommodations. Enjoy easy online booking, real-time availability updates, and secure monthly rent payments.
              </p>
            </div>
            <div className="space-y-3 mt-8">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs">
                  <Link to="/auth/login?role=seeker">
                    <LogIn className="size-4 shrink-0" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full rounded-xl border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-semibold">
                  <Link to="/auth/register?role=seeker">
                    <UserPlus className="size-4 shrink-0" />
                    Sign Up
                  </Link>
                </Button>
              </div>
              <Button asChild variant="ghost" className="w-full rounded-xl hover:bg-slate-800 hover:text-indigo-400 text-slate-400 transition-colors text-xs font-semibold py-1">
                <Link to="/search" className="flex items-center justify-center gap-1">
                  Explore as Guest <ArrowRight className="h-3 w-3 animate-bounce-horizontal" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 2: Owner */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Property Owner</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                List your PG properties, manage room inventory, accept bookings from verified tenants, verify KYC documentation, and track your monthly earnings.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-8">
              <Button asChild className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs border-0">
                <Link to="/auth/login?role=owner">
                  <LogIn className="size-4 shrink-0" />
                  Sign In
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-semibold">
                <Link to="/auth/register?role=owner">
                  <UserPlus className="size-4 shrink-0" />
                  Register
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 3: Admin */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl hover:border-purple-500/40 hover:bg-slate-900/80 transition-all duration-300">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">System Admin</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Platform administration console. Moderate property listings, review and verify owner payouts and KYC credentials, and manage global commissions.
              </p>
            </div>
            <div className="mt-8">
              <Button asChild className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs">
                <Link to="/auth/login?role=admin">
                  <LogIn className="size-4 shrink-0" />
                  Access Admin Panel
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
