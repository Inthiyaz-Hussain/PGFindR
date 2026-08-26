import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ClipboardList, Info } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

const registerOwnerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().trim().email('Enter a valid email address'),
  mobile: z.string().regex(/^\+?[0-9\s-]{10,20}$/, 'Enter a valid mobile number'),
  pgName: z.string().min(3, 'PG Name must be at least 3 characters'),
  pgCity: z.string().min(2, 'Please select or enter the city'),
  pgAddress: z.string().min(5, 'Complete PG Address is required'),
  roomCount: z.number().int().min(1, 'Number of rooms must be at least 1'),
  bedCount: z.number().int().min(1, 'Number of beds must be at least 1'),
  referralSource: z.string().optional().or(z.literal('')),
})

type RegisterOwnerValues = z.infer<typeof registerOwnerSchema>

export function OwnerRegistrationPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
  } = useForm<RegisterOwnerValues>({
    resolver: zodResolver(registerOwnerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      pgName: '',
      pgCity: 'Bengaluru',
      pgAddress: '',
      roomCount: 5,
      bedCount: 10,
      referralSource: '',
    },
  })

  // Prefill form if there's any saved form in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('owner_register_form')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        Object.keys(data).forEach((key) => {
          setValue(key as any, data[key])
        })
        toast.info('Restored your previous inquiry details.')
      } catch (e) {
        console.error('Error parsing saved form', e)
      }
    }
  }, [setValue])

  async function onSubmit(values: RegisterOwnerValues) {
    try {
      setLoading(true)
      // Clean mobile number (strip spaces and hyphens)
      const cleanedValues = {
        ...values,
        mobile: values.mobile.replace(/[\s-]/g, '')
      }
      // 1. Store form values in localStorage
      localStorage.setItem('owner_register_form', JSON.stringify(cleanedValues))

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
                // Redirect to callback route to handle registration validation
                navigate('/owner/register-callback')
              } else {
                toast.error('Google verification was closed or cancelled.')
              }
            }
          }, 1000)
        } else {
          // Mobile redirects automatically...
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
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo-swiftpg.png"
              alt="SwiftPG Logo"
              className="h-11 w-11 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm"
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Swift<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PG</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground font-medium">Verify ownership & list your PG instantly</p>
        </div>

        {/* Card */}
        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xs bg-white/95 dark:bg-slate-900/95">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 mb-2">
              <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Owner Interest Inquiry</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
              Provide details about yourself and your PG. Admin will review this before any account is created.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info Callout */}
            <div className="flex gap-3 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-sm text-blue-800 dark:text-blue-300">
              <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="font-semibold block mb-0.5">Registration Process Note</span>
                This is an interest inquiry. After submitting and verifying your email with Google, SwiftPG Admin will review the legitimacy of your PG details and send a Set Password invitation link within 48 hours.
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                      <Input {...field} id="fullName" placeholder="Suresh Patel" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Email Address */}
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="email">Email Address</FieldLabel>
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
                {/* Mobile Number */}
                <Controller
                  name="mobile"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="mobile">Mobile Number</FieldLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PG City */}
                <Controller
                  name="pgCity"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="pgCity">PG City</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="pgCity" className="bg-background">
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                          <SelectItem value="Pune">Pune</SelectItem>
                          <SelectItem value="Mumbai">Mumbai</SelectItem>
                          <SelectItem value="Delhi">Delhi</SelectItem>
                          <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* How did you hear about SwiftPG? */}
                <Controller
                  name="referralSource"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="referralSource">How did you hear about SwiftPG?</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="referralSource" className="bg-background">
                          <SelectValue placeholder="Select Option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Google">Google Search</SelectItem>
                          <SelectItem value="Friend">Friend / Recommendation</SelectItem>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* PG Full Address */}
              <Controller
                name="pgAddress"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="pgAddress">PG Full Address (including pincode)</FieldLabel>
                    <Textarea
                      {...field}
                      id="pgAddress"
                      rows={3}
                      placeholder="No. 45, 2nd Main Road, Koramangala, Bengaluru - 560034"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Number of Rooms */}
                <Controller
                  name="roomCount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="roomCount">Approximate Number of Rooms</FieldLabel>
                      <Input
                        type="number"
                        id="roomCount"
                        min={1}
                        aria-invalid={fieldState.invalid}
                        value={field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : parseInt(val, 10));
                        }}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* Number of Beds */}
                <Controller
                  name="bedCount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="bedCount">Approximate Total Beds</FieldLabel>
                      <Input
                        type="number"
                        id="bedCount"
                        min={1}
                        aria-invalid={fieldState.invalid}
                        value={field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : parseInt(val, 10));
                        }}
                      />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg hover:shadow-indigo-500/20 py-6 transition-all duration-200 mt-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-5 animate-spin mr-2" />
                ) : null}
                {loading ? 'Initiating Verification…' : 'Verify with Google & Submit Inquiry'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
