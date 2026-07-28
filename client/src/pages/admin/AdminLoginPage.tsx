import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const from = (location.state as { from?: string })?.from || searchParams.get('from') || '/admin'

  useEffect(() => {
    if (user && profile && profile.role === 'admin') {
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
      toast.error(error.message || 'Invalid email or password')
      return
    }

    if (loggedInProfile && loggedInProfile.role !== 'admin') {
      toast.error('Access denied. This page is only for Administrators.')
      return
    }

    toast.success('Welcome back, Admin!')
    navigate('/admin', { replace: true })
  }

  const handleDemoFill = () => {
    setValue('email', 'admin@swiftpg.demo')
    setValue('password', 'Admin@123')
    toast.info('Demo admin credentials filled!')
  }

  const isDev = import.meta.env.DEV

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
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>
              Sign in to access control panel. Public registration is disabled.
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
                <div className="font-semibold text-muted-foreground">Demo Admin Credentials:</div>
                <div>Email: admin@swiftpg.demo</div>
                <div>Password: Admin@123</div>
                <Button variant="outline" size="sm" onClick={handleDemoFill} className="w-full mt-1">
                  Quick Fill Demo Admin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
