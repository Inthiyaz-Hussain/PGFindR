import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'

export function RegisterCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string>('')
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
          setStatus('error')
          setErrorMsg('No active Google authentication session found. Please try again.')
          return
        }

        // 2. Fetch the registration form state
        const savedFormStr = localStorage.getItem('owner_register_form')
        if (!savedFormStr) {
          setStatus('error')
          setErrorMsg('No inquiry details found. Please fill the interest inquiry form first.')
          setTimeout(() => navigate('/owner/register'), 3000)
          return
        }

        const savedForm = JSON.parse(savedFormStr)
        setSubmittedEmail(savedForm.email)

        // 3. Email Match Validation
        const googleEmail = session.user.email?.trim().toLowerCase() || ''
        const formEmail = savedForm.email?.trim().toLowerCase() || ''
        
        if (googleEmail !== formEmail) {
          toast.error('Please sign in with the same Google account as your email above.')
          setStatus('error')
          setErrorMsg('Google account email does not match the email entered in the inquiry form.')
          await supabase.auth.signOut()
          setTimeout(() => navigate('/owner/register'), 4000)
          return
        }

        // 4. Submit to backend API to save inquiry
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/owner/inquiry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            fullName: savedForm.fullName,
            mobile: savedForm.mobile,
            email: savedForm.email,
            pgName: savedForm.pgName,
            pgCity: savedForm.pgCity,
            pgAddress: savedForm.pgAddress,
            pgWhatsappNumber: savedForm.mobile,
            roomCount: Number(savedForm.roomCount),
            bedCount: Number(savedForm.bedCount),
            referralSource: savedForm.referralSource || undefined
          })
        })

        const resData = await response.json()
        if (!response.ok) {
          throw new Error(resData.error || 'Server inquiry submission failed')
        }

        // 5. Cleanup local storage
        localStorage.removeItem('owner_register_form')
        
        // 6. Sign out of Supabase Auth since their account is not approved/created yet!
        await supabase.auth.signOut()
        
        toast.success('Inquiry submitted successfully!')
        navigate('/seeker/about')
      } catch (err: any) {
        console.error('Registration callback error:', err)
        setStatus('error')
        setErrorMsg(err.message || 'Verification failed. Please try again.')
        // Clean up session if any
        await supabase.auth.signOut()
        setTimeout(() => navigate('/owner/register'), 4000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        {status === 'verifying' && (
          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl text-center p-8 flex flex-col items-center gap-5">
            <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verifying Google Account...</h2>
            <p className="text-sm text-muted-foreground">Checking credentials and submitting your interest inquiry to SwiftPG Admin.</p>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl text-center p-8 flex flex-col items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Verification Failed</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <p className="text-xs text-indigo-650 dark:text-indigo-400 animate-pulse mt-2">Redirecting back to form...</p>
          </Card>
        )}

        {status === 'success' && (
          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-8 text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold tracking-tight">Inquiry Received!</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Thank you! Your inquiry has been received. Our team will review it within 48 hours and you will receive an email at <span className="font-semibold text-indigo-600 dark:text-indigo-400">{submittedEmail}</span> with next steps.
              </CardDescription>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
              <Link to="/" className="text-sm font-semibold text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1.5">
                Go back to Homepage <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
