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
import { Separator } from '@/components/ui/separator'
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
      navigate(getRedirectPath(profile.role, from), { replace: true })
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/login?from=${encodeURIComponent(from || '/seeker')}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          data: {
            role: targetRole,
          }
        } as any
      })
      if (error) {
        toast.error(error.message || 'Google Sign-In failed')
      }
    } catch (e) {
      console.error(e)
      toast.error('Google Sign-In error')
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
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 font-medium hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-200 hover:scale-[1.01] shadow-xs"
              onClick={handleGoogleSignIn}
              disabled={isPending}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.29c1.92,-1.78 3.02,-4.4 3.02,-7.4C21.65,11.8 21.55,11.4 21.35,11.1z" fill="#4285F4" />
                <path d="M12,20.8c2.6,0 4.8,-0.8 6.4,-2.3l-3.29,-2.6c-0.9,0.6 -2.07,1 -3.11,1c-3.11,0 -5.74,-2.11 -6.68,-4.96H2.03v2.7C3.65,17.9 7.56,20.8 12,20.8z" fill="#34A853" />
                <path d="M5.32,11.94c-0.24,-0.72 -0.38,-1.5 -0.38,-2.3s0.14,-1.58 0.38,-2.3V4.64H2.03C1.22,6.26 0.76,8.08 0.76,10s0.46,3.74 1.27,5.36L5.32,11.94z" fill="#FBBC05" />
                <path d="M12,4.8c1.44,0 2.72,0.5 3.73,1.46l2.8,-2.8C16.8,1.9 14.6,1.2 12,1.2c-4.44,0 -8.35,2.9 -9.97,7.06l3.29,2.7C6.26,8.11 8.89,6 12,4.8z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </Button>

            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                Or sign in with email
              </span>
            </div>

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

            <div className="mt-6">
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  New to PGFindR?
                </span>
              </div>
              <div className="mt-5 text-center">
                <Link
                  to="/auth/register"
                  className="text-sm font-medium text-primary hover:underline underline-offset-4"
                >
                  Create an account
                </Link>
              </div>
            </div>
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
