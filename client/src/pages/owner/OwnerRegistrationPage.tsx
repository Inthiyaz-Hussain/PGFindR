import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Home, Globe, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import { supabase } from '@/lib/supabase'

const registerOwnerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().email('Enter a valid email address'),
  mobile: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid mobile number'),
  pgName: z.string().min(3, 'PG Name must be at least 3 characters'),
  address: z.string().min(5, 'Address is required'),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode'),
})

type RegisterOwnerValues = z.infer<typeof registerOwnerSchema>

export function OwnerRegistrationPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterOwnerValues>({
    resolver: zodResolver(registerOwnerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      pgName: '',
      address: '',
      pincode: '',
    },
  })

  // Prefill form if there's any saved form in localStorage (e.g. on mismatch retry)
  useEffect(() => {
    const saved = localStorage.getItem('owner_register_form')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        Object.keys(data).forEach((key) => {
          setValue(key as any, data[key])
        })
        toast.info('Restored your previous registration details.')
      } catch (e) {
        console.error('Error parsing saved form', e)
      }
    }
  }, [setValue])

  async function onSubmit(values: RegisterOwnerValues) {
    try {
      setLoading(true)
      // 1. Store form values in localStorage
      localStorage.setItem('owner_register_form', JSON.stringify(values))

      // 2. Initiate Google OAuth
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
      const callbackUrl = `${window.location.origin}/owner/register-callback`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: !isMobile,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) throw error

      if (data?.url) {
        if (!isMobile) {
          // Open popup
          const width = 500
          const height = 600
          const left = window.screenX + (window.outerWidth - width) / 2
          const top = window.screenY + (window.outerHeight - height) / 2
          const popup = window.open(
            data.url,
            'Google OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
          )

          // Poll for popup close or session update
          const interval = setInterval(async () => {
            if (popup?.closed) {
              clearInterval(interval)
              setLoading(false)

              // Verify if session exists now
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                // Redirect to callback page to complete registration
                navigate('/owner/register-callback')
              } else {
                toast.error('Google verification was closed or cancelled.')
              }
            }
          }, 1000)
        } else {
          // Redirecting...
          console.log('Redirecting to Google Auth:', data.url)
        }
      }
    } catch (err: any) {
      setLoading(false)
      toast.error(err.message || 'OAuth initialization failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Logo */}
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
          <p className="text-sm text-muted-foreground font-medium">Verify ownership & list your PG instantly</p>
        </div>

        {/* Card */}
        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xs bg-white/95 dark:bg-slate-900/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 mb-2">
              <Home className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Owner Registration</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Provide your details and complete Google verification to get started.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                      <Input {...field} id="fullName" placeholder="Suresh Patel" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

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
                        placeholder="suresh@example.com"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mobile */}
                <Controller
                  name="mobile"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="mobile">Mobile number</FieldLabel>
                      <Input
                        {...field}
                        id="mobile"
                        type="tel"
                        placeholder="+91 9876543210"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* PG Name */}
                <Controller
                  name="pgName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="pgName">PG Listing Name</FieldLabel>
                      <Input {...field} id="pgName" placeholder="Royal Palms PG" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Address */}
                <div className="md:col-span-2">
                  <Controller
                    name="address"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="address">PG Address</FieldLabel>
                        <Input
                          {...field}
                          id="address"
                          placeholder="No. 45, 2nd Main Road, Koramangala"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                {/* Pincode */}
                <Controller
                  name="pincode"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="pincode">Pincode</FieldLabel>
                      <Input {...field} id="pincode" placeholder="560034" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <Globe className="size-4 mr-2" />
                )}
                {loading ? 'Initiating Verification…' : 'Verify with Google & Submit'}
              </Button>
            </form>

            <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="text-sm text-muted-foreground mr-1.5">Already registered?</span>
              <Link to="/owner/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1">
                Sign in to Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
