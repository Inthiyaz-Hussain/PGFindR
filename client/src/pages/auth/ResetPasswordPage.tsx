import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { supabase } from '@/lib/supabase'

const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

type ResetFormValues = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('No active recovery session found.')
      }
    }
    checkSession()
  }, [])

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetFormValues) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      })

      if (error) throw error

      toast.success('Password set successfully! You can now log in.')
      navigate('/auth/login?role=owner', { replace: true })
    } catch (err: any) {
      console.error('Password update error:', err)
      toast.error(err.message || 'Failed to update password. Try requesting a new link.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo-swiftpg.png"
              alt="FindPgR Logo"
              className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm"
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Find<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PgR</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground font-medium">Configure your account credentials</p>
        </div>

        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xs bg-white/95 dark:bg-slate-900/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 mb-2">
              <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Set Account Password</CardTitle>
            <CardDescription>Enter a new secure password for your owner portal profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="password">New Password</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <FieldError />
                  </Field>
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <Input
                      {...field}
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError />
                  </Field>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-600/10 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password & Log In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ResetPasswordPage
