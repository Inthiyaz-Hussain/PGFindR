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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getRedirectPath(role: string, fromPath: string): string {
  if (fromPath) {
    if (fromPath.startsWith('/admin')) {
      return role === 'admin' ? fromPath : `/${role}`
    }
    if (fromPath.startsWith('/owner')) {
      return role === 'owner' ? fromPath : `/${role}`
    }
    if (fromPath.startsWith('/seeker')) {
      return role === 'seeker' ? fromPath : `/${role}`
    }
    return fromPath
  }
  return `/${role}`
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotDialog, setShowForgotDialog] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)
  const { login, user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const from = (location.state as { from?: string })?.from || searchParams.get('from') || ''
  const queryRole = searchParams.get('role')
  const targetRole =
    queryRole === 'owner' || queryRole === 'admin' || queryRole === 'seeker'
      ? queryRole
      : from.startsWith('/owner')
      ? 'owner'
      : from.startsWith('/admin')
      ? 'admin'
      : 'seeker'

  useEffect(() => {
    if (user && profile) {
      const role = profile.role
      // Only auto-redirect if the current user's role matches the target role.
      // Otherwise, keep the login page open so they can switch accounts.
      if (role === targetRole) {
        if (role === 'owner') {
          const isApproved = !!profile.onboarding_verified && profile.kyc_status === 'approved'
          if (!isApproved) {
            navigate('/owner/onboarding', { replace: true })
            return
          }
        }
        navigate(getRedirectPath(role, from), { replace: true })
      }
    }
  }, [user, profile, navigate, from, targetRole])

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const handleDemoFill = (email: string, password: string) => {
    setValue('email', email)
    setValue('password', password)
    toast.info('Demo credentials filled!')
  }

  const isPending = isSubmitting

  async function onSubmit(values: LoginFormValues) {
    const { error, profile } = await login(values.email, values.password)
    if (error) {
      toast.error(error.message || 'Invalid email or password')
      return
    }
    toast.success('Welcome back!')
    if (profile) {
      if (profile.role === 'owner') {
        const isApproved = !!profile.onboarding_verified && profile.kyc_status === 'approved'
        if (!isApproved) {
          navigate('/owner/onboarding', { replace: true })
          return
        }
      }
      navigate(getRedirectPath(profile.role, from), { replace: true })
    }
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo-swiftpg.png"
              alt="FindPgR Icon"
              className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-xs"
            />
            <span className="text-2xl font-bold tracking-tight text-indigo-950 dark:text-slate-100">
              Find<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PgR</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">India's trusted PG discovery platform</p>
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {targetRole === 'owner' ? 'Owner Sign In' : targetRole === 'admin' ? 'Admin Sign In' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {targetRole === 'owner'
                ? 'Sign in to manage your listings and bookings'
                : targetRole === 'admin'
                ? 'Sign in to access control panel'
                : 'Sign in to your account to continue'}
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
                      disabled={isPending}
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
                      <button
                        type="button"
                        onClick={() => setShowForgotDialog(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 font-medium"
                      >
                        Forgot password?
                      </button>
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
                        disabled={isPending}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={isPending}
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
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                {isPending ? 'Please wait…' : 'Sign in'}
              </Button>
            </form>

            {/* Quick Demo Login */}
            {import.meta.env.DEV && targetRole === 'owner' && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-2 border">
                <div className="font-semibold text-muted-foreground">Demo Owner Credentials:</div>
                <div>Email: owner@swiftpg.demo</div>
                <div>Password: Owner@123</div>
                <Button variant="outline" size="sm" onClick={() => handleDemoFill('owner@swiftpg.demo', 'Owner@123')} className="w-full mt-1">
                  Quick Fill Demo Owner
                </Button>
              </div>
            )}

            {import.meta.env.DEV && targetRole === 'admin' && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-2 border">
                <div className="font-semibold text-muted-foreground">Demo Admin Credentials:</div>
                <div>Email: admin@swiftpg.demo</div>
                <div>Password: Admin@123</div>
                <Button variant="outline" size="sm" onClick={() => handleDemoFill('admin@swiftpg.demo', 'Admin@123')} className="w-full mt-1">
                  Quick Fill Demo Admin
                </Button>
              </div>
            )}

            {import.meta.env.DEV && targetRole === 'seeker' && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-2 border">
                <div className="font-semibold text-muted-foreground">Demo Seeker Credentials:</div>
                <div>Email: seeker@swiftpg.demo</div>
                <div>Password: Seeker@123</div>
                <Button variant="outline" size="sm" onClick={() => handleDemoFill('seeker@swiftpg.demo', 'Seeker@123')} className="w-full mt-1">
                  Quick Fill Demo Seeker
                </Button>
              </div>
            )}


          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="underline underline-offset-2 cursor-pointer hover:text-foreground">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline underline-offset-2 cursor-pointer hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your registered email address and we will send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Field>
              <FieldLabel htmlFor="forgot-email">Email Address</FieldLabel>
              <Input
                id="forgot-email"
                type="email"
                placeholder="yourname@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForgotDialog(false)
                  setForgotEmail('')
                }}
                disabled={sendingReset}
              >
                Cancel
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                disabled={sendingReset || !forgotEmail.trim()}
                onClick={async () => {
                  try {
                    setSendingReset(true)
                    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                      redirectTo: `${window.location.origin}/auth/reset-password`
                    })
                    if (error) throw error

                    toast.success('Password reset link sent! Please check your email inbox.')
                    setShowForgotDialog(false)
                    setForgotEmail('')
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to send reset link.')
                  } finally {
                    setSendingReset(false)
                  }
                }}
              >
                {sendingReset ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
