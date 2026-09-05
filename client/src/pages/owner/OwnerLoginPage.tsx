import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'

import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function OwnerLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const from = (location.state as { from?: string })?.from || searchParams.get('from') || '/owner'

  // OTP Verification States
  const [showOtpConfirm, setShowOtpConfirm] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [confirmingInstantly, setConfirmingInstantly] = useState(false)

  useEffect(() => {
    if (user && profile && profile.role === 'owner') {
      navigate(from, { replace: true })
    }
  }, [user, profile, navigate, from])

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    const { error, profile: loggedInProfile } = await login(values.email, values.password)
    if (error) {
      const errMsg = error.message.toLowerCase()
      // If error is related to unconfirmed email, open OTP verification block
      if (
        errMsg.includes('confirm') ||
        errMsg.includes('verify') ||
        errMsg.includes('verification')
      ) {
        setPendingEmail(values.email)
        setShowOtpConfirm(true)
        toast.info('Your email is not confirmed yet. We have sent a verification code to your email.')
        // Request Supabase to trigger sending confirmation email OTP
        await supabase.auth.resend({ type: 'signup', email: values.email })
        return
      }
      toast.error(error.message || 'Invalid email or password')
      return
    }

    if (loggedInProfile && loggedInProfile.role !== 'owner') {
      toast.error('Access denied. This page is only for PG Owners.')
      return
    }

    toast.success('Welcome back!')
    navigate('/owner', { replace: true })
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode || otpCode.length < 6) {
      toast.error('Enter a valid 6-digit OTP code')
      return
    }

    try {
      setVerifyingOtp(true)
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otpCode,
        type: 'signup'
      })

      if (error) throw error

      toast.success('Email verified successfully! Logging you in...')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP code. Please try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  async function handleInstantConfirm() {
    try {
      setConfirmingInstantly(true)
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/admin/confirm-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      })
      const resData = await res.json()
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to auto-confirm email')
      }
      toast.success('Email auto-confirmed via Dev Mode! Logging you in...')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Auto-confirmation failed')
    } finally {
      setConfirmingInstantly(false)
    }
  }

  const handleDemoFill = () => {
    setValue('email', 'owner@findpgroom.demo')
    setValue('password', 'Owner@123')
    toast.info('Demo owner credentials filled!')
  }

  const isDev = import.meta.env.DEV

  // Render OTP Verification form if requested
  if (showOtpConfirm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/logo-findpgroom.png"
                alt="FindPgR Icon"
                className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-xs"
              />
              <span className="text-2xl font-bold tracking-tight text-indigo-950 dark:text-slate-100">
                Find<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PgR</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">Verify ownership & list your PG instantly</p>
          </div>

          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xs bg-white/95 dark:bg-slate-900/95">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Email Verification Required</CardTitle>
              <CardDescription>
                We've sent a 6-digit OTP code to <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingEmail}</span>.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="otp">Enter 6-Digit OTP</FieldLabel>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    disabled={verifyingOtp}
                  />
                </Field>

                <Button type="submit" className="w-full" disabled={verifyingOtp}>
                  {verifyingOtp ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  {verifyingOtp ? 'Verifying OTP…' : 'Verify & Sign In'}
                </Button>

                {/* Localhost Auto-Confirm Helper */}
                {isDev && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleInstantConfirm}
                    className="w-full border border-indigo-100/50 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 dark:bg-slate-800 dark:border-slate-700 hover:bg-indigo-50/50 transition-colors"
                    disabled={confirmingInstantly}
                  >
                    {confirmingInstantly ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Auto-Confirm Email (Dev Mode)'
                    )}
                  </Button>
                )}

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setShowOtpConfirm(false)}
                    className="text-sm font-medium text-muted-foreground hover:underline underline-offset-4"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo-findpgroom.png"
              alt="FindPgR Icon"
              className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-xs"
            />
            <span className="text-2xl font-bold tracking-tight text-indigo-950 dark:text-slate-100">
              Find<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PgR</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">India's trusted PG discovery platform</p>
        </div>

        {/* Premium Banner */}
        <div className="w-full h-36 sm:h-44 rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-slate-900/5">
          <img 
            src="/owner-banner.jpg" 
            alt="Premium Property Management" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-5">
            <span className="text-white font-bold text-lg sm:text-xl">Grow Your PG Business</span>
            <span className="text-white/80 text-xs sm:text-sm mt-1">Manage everything in one powerful platform</span>
          </div>
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Owner Sign In</CardTitle>
            <CardDescription>
              Sign in to manage your listings and bookings
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email */}
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      aria-invalid={fieldState.invalid}
                      disabled={isSubmitting}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Password */}
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                    </div>
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        className="pr-10"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                {isSubmitting ? 'Please wait…' : 'Sign in'}
              </Button>
            </form>

            {/* Quick Demo Login */}
            {isDev && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-2 border">
                <div className="font-semibold text-muted-foreground">Demo Owner Credentials:</div>
                <div>Email: owner@findpgroom.demo</div>
                <div>Password: Owner@123</div>
                <Button variant="outline" size="sm" onClick={handleDemoFill} className="w-full mt-1">
                  Quick Fill Demo Owner
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            New to PGFindR?{' '}
            <Link
              to="/owner/signup"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Register Your PG
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="underline underline-offset-2 cursor-pointer hover:text-foreground">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline underline-offset-2 cursor-pointer hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
