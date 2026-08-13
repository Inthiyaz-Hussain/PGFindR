import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function RegisterCallback() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const isExecuting = useRef(false)

  useEffect(() => {
    async function handleAuthCallback() {
      if (isExecuting.current) return
      isExecuting.current = true

      try {
        // 1. Get the session
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) throw sessionErr
        if (!session?.user) {
          setErrorMsg('No active Google authentication session found. Please try again.')
          return
        }

        // 2. Fetch the registration form state
        const savedFormStr = localStorage.getItem('owner_register_form')
        if (!savedFormStr) {
          setErrorMsg('No registration details found in this session. Please fill the form first.')
          setTimeout(() => navigate('/owner/register'), 3000)
          return
        }

        const savedForm = JSON.parse(savedFormStr)

        // 3. Email Match Validation
        if (session.user.email !== savedForm.email) {
          toast.error('Please sign in with the same Google account as your email above.')
          await supabase.auth.signOut()
          navigate('/owner/register')
          return
        }

        // 4. Submit to backend API to complete registration
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/auth/register-owner`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            fullName: savedForm.fullName,
            mobile: savedForm.mobile,
            mobileAlternate: savedForm.mobileAlternate || undefined,
            pgName: savedForm.pgName,
            address: savedForm.address,
            pincode: savedForm.pincode,
            email: savedForm.email
          })
        })

        const resData = await response.json()
        if (!response.ok) {
          throw new Error(resData.error || 'Server registration failed')
        }

        // 5. Cleanup and redirect or close window
        localStorage.removeItem('owner_register_form')
        await refreshProfile()
        toast.success('Google verification completed successfully!')
        
        if (window.opener && window.opener !== window) {
          window.close()
        } else {
          navigate('/owner/about')
        }
      } catch (err: any) {
        console.error('Registration callback error:', err)
        setErrorMsg(err.message || 'Verification failed. Please try again.')
        // Sign out to clean up session
        await supabase.auth.signOut()
        setTimeout(() => navigate('/owner/register'), 4000)
      }
    }

    handleAuthCallback()
  }, [navigate, refreshProfile])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="w-full max-w-md p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col items-center gap-5">
        {errorMsg ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verification Mismatch</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 animate-pulse mt-2">Redirecting to registration form...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verifying Google Account...</h2>
            <p className="text-sm text-muted-foreground">Checking credentials and setting up your owner portal workspace.</p>
          </>
        )}
      </div>
    </div>
  )
}
