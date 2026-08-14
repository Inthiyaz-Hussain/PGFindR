import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, KeyRound, AlertCircle, CheckCircle2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
      .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
      .regex(/[0-9]/, 'Must contain at least 1 digit')
      .regex(/[!@#$%^&*]/, 'Must contain at least 1 special character (!@#$%^&*)'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SetPasswordValues = z.infer<typeof setPasswordSchema>

export function OwnerSetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [inquiryDetails, setInquiryDetails] = useState<{ email: string; fullName: string; pgName: string } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const passwordVal = watch('password', '')

  // Password rules validation helper for UI visual feedback
  const rules = {
    length: passwordVal.length >= 8,
    uppercase: /[A-Z]/.test(passwordVal),
    lowercase: /[a-z]/.test(passwordVal),
    number: /[0-9]/.test(passwordVal),
    special: /[!@#$%^&*]/.test(passwordVal),
  }

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidationError('Invalid invitation link. Token query parameter is missing.')
        setLoading(false)
        return
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/owner/set-password?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setValidationError(data.error || 'Token validation failed.')
          setTokenValid(false)
        } else {
          setInquiryDetails(data)
          setTokenValid(true)
        }
      } catch (err) {
        console.error(err)
        setValidationError('Failed to connect to verification server.')
        setTokenValid(false)
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [token])

  async function onSubmit(values: SetPasswordValues) {
    if (!token) return

    try {
      setSubmitting(true)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/owner/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password.')
      }

      setSuccess(true)
      toast.success('Account password set successfully!')
    } catch (err: any) {
      toast.error(err.message || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Loader2 className="h-10 w-10 text-indigo-650 animate-spin" />
      </div>
    )
  }

  if (validationError || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-900/30 shadow-2xl text-center p-8 flex flex-col items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Link Invalid or Expired</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {validationError || 'This link has expired or is invalid. Please contact support@swiftpg.in'}
          </p>
          <div className="pt-2 border-t w-full">
            <Link to="/" className="text-sm font-semibold text-indigo-650 hover:underline">
              Back to Home
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
        <Card className="w-full max-w-md border-green-250 dark:border-green-900/30 shadow-2xl text-center p-8 flex flex-col items-center gap-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Password Set!</CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              Your password has been set! Your SwiftPG owner account is now active. Click below to log in.
            </CardDescription>
          </div>
          <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6">
            <Link to="/owner/login">Log In to Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/logo-swiftpg.png" alt="SwiftPG" className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm" />
          <h1 className="text-2xl font-bold tracking-tight mt-2">Activate Owner Account</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-slate-900 dark:text-slate-200">{inquiryDetails?.fullName}</span>! Set a password for your account linked to <span className="font-medium">{inquiryDetails?.email}</span>.
          </p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="size-4 text-indigo-650" />
              Set Password
            </CardTitle>
            <CardDescription>
              Create a secure password to list your PG: <span className="font-semibold">{inquiryDetails?.pgName}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Password */}
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="password">New Password</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        aria-invalid={fieldState.invalid}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Confirm Password */}
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        aria-invalid={fieldState.invalid}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Live Rule Indicators */}
              <div className="rounded-lg bg-muted/40 p-3 space-y-2 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Password Requirements:</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                  {[
                    { key: 'length', text: 'Min. 8 characters' },
                    { key: 'uppercase', text: '1 Uppercase (A-Z)' },
                    { key: 'lowercase', text: '1 Lowercase (a-z)' },
                    { key: 'number', text: '1 Number (0-9)' },
                    { key: 'special', text: '1 Special (!@#$%^&*)' },
                  ].map((rule) => {
                    const passed = rules[rule.key as keyof typeof rules]
                    return (
                      <div key={rule.key} className="flex items-center gap-1.5">
                        {passed ? (
                          <Check className="size-3.5 text-green-600 shrink-0" />
                        ) : (
                          <X className="size-3.5 text-red-500 shrink-0" />
                        )}
                        <span className={passed ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-500'}>
                          {rule.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button type="submit" className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-medium py-6 transition-all mt-2" disabled={submitting}>
                {submitting ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
                {submitting ? 'Activating Account…' : 'Set Password & Activate Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
