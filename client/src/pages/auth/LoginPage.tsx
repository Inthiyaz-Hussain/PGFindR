import { useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const isPending = isSubmitting

  async function onSubmit(values: LoginFormValues) {
    const { error, profile } = await login(values.email, values.password)
    if (error) {
      toast.error(error.message || 'Invalid email or password')
      return
    }
    toast.success('Welcome back!')
    const role = profile?.role
    if (role === 'owner') navigate('/owner', { replace: true })
    else if (role === 'admin') navigate('/admin', { replace: true })
    else navigate(from || '/seeker', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight">PGFindR</span>
          </Link>
          <p className="text-sm text-muted-foreground">India's trusted PG discovery platform</p>
        </div>

        {/* Card */}
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
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
                      <span className="text-xs text-muted-foreground">
                        Forgot password?
                      </span>
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

            <div className="mt-5">
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
          <span className="underline underline-offset-2 cursor-pointer hover:text-foreground">Terms</span>{' '}
          and{' '}
          <span className="underline underline-offset-2 cursor-pointer hover:text-foreground">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
