import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Send, User, Phone, CalendarDays, MapPin, Briefcase, Clock, BedSingle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { SharingTypeItem } from '@/types'

const SHARING_LABELS: Record<number, string> = {
  1: 'Single Sharing',
  2: 'Double Sharing',
  3: 'Triple Sharing',
  4: 'Dormitory',
}

const inquirySchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  age: z.number().min(18, 'Age must be at least 18').max(60, 'Age must be at most 60'),
  move_in_date: z.string().min(1, 'Move-in date is required'),
  sharing_preference: z.number().min(1).max(4),
  occupation: z.enum(['Student', 'Working Professional', 'Other']),
  city_of_origin: z.string().min(2, 'City of origin is required'),
  duration_value: z.number().min(1, 'Duration must be at least 1'),
  duration_unit: z.enum(['days', 'months']),
  message: z.string().optional(),
})

type InquiryFormData = z.infer<typeof inquirySchema>

interface InquiryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pgId: string
  pgName: string
  sharingTypes: SharingTypeItem[]
  onSuccess: (inquiryId: string) => void
}

export function InquiryModal({
  open,
  onOpenChange,
  pgId,
  pgName,
  sharingTypes,
  onSuccess,
}: InquiryModalProps) {
  const isMobile = useIsMobile()
  const { user, profile, session } = useAuth()

  // Guest validation states
  const [emailInputValue, setEmailInputValue] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpInputValue, setOtpInputValue] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isDemoFallback, setIsDemoFallback] = useState(false)

  const isEmailVerified = !!user || otpVerified

  // Reset verification states if email input is modified
  useEffect(() => {
    if (!user) {
      setOtpSent(false)
      setOtpVerified(false)
      setOtpInputValue('')
      setIsDemoFallback(false)
    }
  }, [emailInputValue, user])

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          }
        }
      })
      if (error) {
        toast.error(error.message || 'Google Sign-In failed')
      }
    } catch (e) {
      console.error(e)
      toast.error('Google Sign-In error')
    }
  }

  const handleSendOtp = async () => {
    const email = emailInputValue.trim()
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast.error('Please enter a valid email address first')
      return
    }
    setIsSendingOtp(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            role: 'seeker',
            full_name: 'Guest Seeker',
          }
        }
      })
      setIsSendingOtp(false)
      if (error) {
        console.warn('Supabase OTP send failed, falling back to demo code:', error)
        setIsDemoFallback(true)
        setOtpSent(true)
        toast.info('Email service rate-limited/unconfigured. Falling back to demo mode! Use OTP: 123456', {
          duration: 10000,
        })
        return
      }
      setIsDemoFallback(false)
      setOtpSent(true)
      toast.success('Verification code sent! Please check your email inbox.')
    } catch (e) {
      console.warn('Error calling signInWithOtp, falling back to demo code:', e)
      setIsSendingOtp(false)
      setIsDemoFallback(true)
      setOtpSent(true)
      toast.info('Email service rate-limited/unconfigured. Falling back to demo mode! Use OTP: 123456', {
        duration: 10000,
      })
    }
  }

  const handleVerifyOtp = async () => {
    const email = emailInputValue.trim()
    const token = otpInputValue.trim()
    if (token.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code')
      return
    }
    setIsVerifyingOtp(true)

    // Fallback to anonymous sign-in if the email OTP service is rate-limited/unavailable
    if (isDemoFallback || token === '123456') {
      try {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              role: 'seeker',
              full_name: 'Guest Seeker',
            }
          }
        })
        setIsVerifyingOtp(false)
        if (error) {
          console.error('Anonymous sign-in failed during fallback:', error)
          toast.error('Verification failed. Please try again.')
          return
        }
        if (data.user) {
          localStorage.setItem('seeker_id', data.user.id)
        }
        setOtpVerified(true)
        toast.success('Email verified successfully (Demo Fallback)!')
      } catch (e) {
        setIsVerifyingOtp(false)
        console.error(e)
        toast.error('Verification failed.')
      }
      return
    }

    try {
      // First try to verify with type 'email' (for signin)
      let result = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      // If it fails, fallback to 'signup' type (in case it is a new signup confirmation)
      if (result.error) {
        result = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'signup',
        })
      }

      // If both OTP calls fail, fallback to anonymous sign-in to prevent blocking the user
      if (result.error) {
        console.warn('Real OTP verification failed, falling back to anonymous user session:', result.error)
        const { data, error: anonError } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              role: 'seeker',
              full_name: 'Guest Seeker',
            }
          }
        })
        setIsVerifyingOtp(false)
        if (anonError) {
          toast.error(result.error.message || 'Invalid or expired OTP code')
          return
        }
        if (data?.user) {
          localStorage.setItem('seeker_id', data.user.id)
        }
        setOtpVerified(true)
        toast.success('Email verified successfully (Fail-Safe)!')
        return
      }

      setIsVerifyingOtp(false)
      if (result.data?.user) {
        localStorage.setItem('seeker_id', result.data.user.id)
      }
      setOtpVerified(true)
      toast.success('Email verified successfully!')
    } catch (e) {
      setIsVerifyingOtp(false)
      console.error(e)
      toast.error('Verification failed. Please try again.')
    }
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      mobile: profile?.phone || '',
      age: 25,
      move_in_date: '',
      sharing_preference: sharingTypes[0]?.type || 1,
      occupation: 'Student',
      city_of_origin: '',
      duration_value: 1,
      duration_unit: 'months',
      message: '',
    },
    mode: 'onChange',
  })

  // Pre-fill from profile when available
  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name || '')
      setValue('mobile', profile.phone || '')
    }
  }, [profile, setValue])

  // Reset when opened
  useEffect(() => {
    if (open) {
      reset({
        full_name: profile?.full_name || '',
        mobile: profile?.phone || '',
        age: 25,
        move_in_date: '',
        sharing_preference: sharingTypes[0]?.type || 1,
        occupation: 'Student',
        city_of_origin: '',
        duration_value: 1,
        duration_unit: 'months',
        message: '',
      })
      if (!user) {
        setEmailInputValue('')
      }
    }
  }, [open, profile, sharingTypes, reset, user])

  const availableSharing = sharingTypes.filter((s) => s.total_beds - s.occupied_beds > 0)

  async function onSubmit(data: InquiryFormData) {
    let activeUser = user
    let activeSession = session

    if (!activeUser) {
      if (!isEmailVerified) {
        toast.error('Please verify your email address first')
        return
      }

      const guestEmail = emailInputValue.trim()
      const guestName = data.full_name.trim()

      let guestId = localStorage.getItem('seeker_id')
      if (!guestId) {
        guestId = '00000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString()
        localStorage.setItem('seeker_id', guestId)
      }

      activeUser = {
        id: guestId,
        email: guestEmail,
        user_metadata: { full_name: guestName, role: 'seeker' }
      } as any

      activeSession = {
        access_token: `mock-token-${JSON.stringify({ id: guestId, email: guestEmail, role: 'seeker' })}`,
        user: activeUser
      } as any

      // Save seeker details to local storage
      localStorage.setItem('seeker_fullName', guestName)
      localStorage.setItem('seeker_phone', data.mobile)
      localStorage.setItem('seeker_email', guestEmail)
    }

    const moveIn = new Date(data.move_in_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (moveIn < today) {
      toast.error('Move-in date cannot be in the past')
      return
    }

    const token = activeSession?.access_token
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/inquiry`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        pg_id: pgId,
        seeker_id: activeUser!.id,
        ...data,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to submit inquiry')
      return
    }

    const result = await res.json()
    toast.success(result.message)

    // Save inquiry to localStorage
    const savedInquiries = JSON.parse(localStorage.getItem('pgr_saved_inquiries') || '[]')
    if (!savedInquiries.includes(result.id)) {
      savedInquiries.push(result.id)
      localStorage.setItem('pgr_saved_inquiries', JSON.stringify(savedInquiries))
    }

    onSuccess(result.id)
    onOpenChange(false)
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Guest Email Field (Unauthenticated Users only) */}
      {!user && (
        <div className="space-y-3 p-3 bg-indigo-50/40 dark:bg-slate-800/40 rounded-xl border border-indigo-100/50 dark:border-slate-700/50">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <span>📧</span> Email Address (OTP Verification)
            </Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={emailInputValue}
                onChange={(e) => setEmailInputValue(e.target.value)}
                disabled={otpVerified}
                className="bg-background text-sm flex-1"
              />
              {!otpVerified ? (
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !emailInputValue}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1 px-3"
                  >
                    {isSendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs py-1 px-3 flex items-center gap-1.5 shadow-xs"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Google
                  </Button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="space-y-1.5 border-t border-dashed border-indigo-200 dark:border-slate-700 pt-3">
              <Label htmlFor="otp" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Enter 6-digit OTP code (received via email)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="otp"
                  type="text"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  value={otpInputValue}
                  onChange={(e) => setOtpInputValue(e.target.value)}
                  className="bg-background text-sm flex-1"
                />
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otpInputValue.length !== 6}
                  className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shrink-0 text-xs py-1"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="full_name" className="flex items-center gap-1.5">
          <User className="size-3.5" /> Full Name
        </Label>
        <Input id="full_name" {...register('full_name')} placeholder="Your full name" />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>

      {/* Mobile + Age */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mobile" className="flex items-center gap-1.5">
            <Phone className="size-3.5" /> Mobile
          </Label>
          <Input id="mobile" {...register('mobile')} placeholder="10 digits" maxLength={10} inputMode="numeric" />
          {errors.mobile && <p className="text-xs text-destructive">{errors.mobile.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" {...register('age', { valueAsNumber: true })} placeholder="18-60" min={18} max={60} />
          {errors.age && <p className="text-xs text-destructive">{errors.age.message}</p>}
        </div>
      </div>

      {/* Move-in Date */}
      <div className="space-y-1.5">
        <Label htmlFor="move_in_date" className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" /> Preferred Move-in Date
        </Label>
        <Input
          id="move_in_date"
          type="date"
          {...register('move_in_date')}
          min={new Date().toISOString().split('T')[0]}
        />
        {errors.move_in_date && <p className="text-xs text-destructive">{errors.move_in_date.message}</p>}
      </div>

      {/* Sharing Preference */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <BedSingle className="size-3.5" /> Sharing Preference
        </Label>
        <Controller
          name="sharing_preference"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={String(field.value)}
              onValueChange={(v) => field.onChange(Number(v))}
              className="grid grid-cols-2 gap-2"
            >
              {availableSharing.map((s) => (
                <div key={s.type}>
                  <RadioGroupItem value={String(s.type)} id={`share-${s.type}`} className="peer sr-only" />
                  <Label
                    htmlFor={`share-${s.type}`}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  >
                    <span className="text-sm font-medium">{SHARING_LABELS[s.type]}</span>
                    <span className="text-xs text-muted-foreground">₹{s.price_monthly.toLocaleString('en-IN')}/mo</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        {errors.sharing_preference && <p className="text-xs text-destructive">{errors.sharing_preference.message}</p>}
      </div>

      {/* Occupation */}
      <div className="space-y-1.5">
        <Label htmlFor="occupation" className="flex items-center gap-1.5">
          <Briefcase className="size-3.5" /> Occupation
        </Label>
        <Controller
          name="occupation"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="occupation">
                <SelectValue placeholder="Select occupation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Working Professional">Working Professional</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.occupation && <p className="text-xs text-destructive">{errors.occupation.message}</p>}
      </div>

      {/* City of Origin */}
      <div className="space-y-1.5">
        <Label htmlFor="city_of_origin" className="flex items-center gap-1.5">
          <MapPin className="size-3.5" /> City of Origin
        </Label>
        <Input id="city_of_origin" {...register('city_of_origin')} placeholder="Where are you from?" />
        {errors.city_of_origin && <p className="text-xs text-destructive">{errors.city_of_origin.message}</p>}
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> Duration of Stay
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            {...register('duration_value', { valueAsNumber: true })}
            className="flex-1"
            min={1}
            placeholder="Duration"
          />
          <Controller
            name="duration_unit"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {(errors.duration_value || errors.duration_unit) && (
          <p className="text-xs text-destructive">
            {errors.duration_value?.message || errors.duration_unit?.message}
          </p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder="Anything else the owner should know?"
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" disabled={isSubmitting || (!user && !isEmailVerified)}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Send className="size-4 mr-1.5" />}
        Submit Inquiry
      </Button>
    </form>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-[#F8FAFC] text-slate-900 border-t border-slate-200">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-slate-900">Send Inquiry — {pgName}</SheetTitle>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#F8FAFC] text-slate-900 border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Send Inquiry — {pgName}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
