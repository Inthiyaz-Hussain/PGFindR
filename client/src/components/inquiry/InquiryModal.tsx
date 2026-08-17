import { useEffect } from 'react'
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
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  age: z.number().min(18, 'Age must be at least 18').max(60, 'Age must be at most 60'),
  move_in_date: z.string().min(1, 'Move-in date is required'),
  sharing_preference: z.number().min(1).max(4),
  num_beds: z.number({ message: 'Enter a valid digit' }).min(1, 'At least 1 bed required').max(10, 'Maximum 10 beds allowed'),
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
  selectedSharingType?: number | null
  onSuccess: (inquiryId: string) => void
}

export function InquiryModal({
  open,
  onOpenChange,
  pgId,
  pgName,
  sharingTypes,
  selectedSharingType,
  onSuccess,
}: InquiryModalProps) {
  const isMobile = useIsMobile()
  const { user, profile, session } = useAuth()

  const isEmailVerified = !!user

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      mobile: profile?.phone || '',
      email: user?.email || '',
      age: 25,
      move_in_date: '',
      sharing_preference: selectedSharingType || sharingTypes[0]?.type || 1,
      num_beds: 1,
      occupation: 'Student',
      city_of_origin: '',
      duration_value: 1,
      duration_unit: 'months',
      message: '',
    },
    mode: 'onChange',
  })

  const selectedPref = watch('sharing_preference')
  const sharingPrefLabel = selectedPref ? SHARING_LABELS[selectedPref] : ''

  const maxBedsAllowed = 10

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
        email: user?.email || '',
        age: 25,
        move_in_date: '',
        sharing_preference: selectedSharingType || sharingTypes[0]?.type || 1,
        num_beds: 1,
        occupation: 'Student',
        city_of_origin: '',
        duration_value: 1,
        duration_unit: 'months',
        message: '',
      })
      // No guest email state to reset
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

      // Check if we can get the session directly from supabase
      const { data: { session: latestSession } } = await supabase.auth.getSession()
      if (latestSession) {
        activeUser = latestSession.user
        activeSession = latestSession
      }
    }

    if (!activeUser) {
      toast.error('Authentication session not found. Please verify your email again.')
      return
    }

    // Save seeker details to local storage
    if (activeUser.email) {
      localStorage.setItem('seeker_fullName', data.full_name.trim())
      localStorage.setItem('seeker_phone', data.mobile)
      localStorage.setItem('seeker_email', activeUser.email)
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
        <div className="space-y-3.5 p-4 bg-indigo-50/30 dark:bg-slate-800/30 rounded-xl border border-indigo-100/50 dark:border-slate-700/50 text-center">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Identity Verification Required
            </h4>
            <p className="text-xs text-muted-foreground">
              Please sign in with Google to verify your email and submit this inquiry.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 py-2 flex items-center justify-center gap-2 font-medium shadow-xs hover:scale-[1.01] transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.29c1.92,-1.78 3.02,-4.4 3.02,-7.4C21.65,11.8 21.55,11.4 21.35,11.1z" fill="#4285F4" />
              <path d="M12,20.8c2.6,0 4.8,-0.8 6.4,-2.3l-3.29,-2.6c-0.9,0.6 -2.07,1 -3.11,1c-3.11,0 -5.74,-2.11 -6.68,-4.96H2.03v2.7C3.65,17.9 7.56,20.8 12,20.8z" fill="#34A853" />
              <path d="M5.32,11.94c-0.24,-0.72 -0.38,-1.5 -0.38,-2.3s0.14,-1.58 0.38,-2.3V4.64H2.03C1.22,6.26 0.76,8.08 0.76,10s0.46,3.74 1.27,5.36L5.32,11.94z" fill="#FBBC05" />
              <path d="M12,4.8c1.44,0 2.72,0.5 3.73,1.46l2.8,-2.8C16.8,1.9 14.6,1.2 12,1.2c-4.44,0 -8.35,2.9 -9.97,7.06l3.29,2.7C6.26,8.11 8.89,6 12,4.8z" fill="#EA4335" />
            </svg>
            Verify with Google
          </Button>
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

      {/* Number of Beds Selection */}
      <div className="space-y-1.5">
        <Label htmlFor="num_beds" className="flex items-center gap-1.5">
          <BedSingle className="size-3.5" /> Number of Beds
        </Label>
        <Input
          id="num_beds"
          type="number"
          placeholder={`Enter number of beds (1-${maxBedsAllowed})`}
          min={1}
          max={maxBedsAllowed}
          {...register('num_beds', { valueAsNumber: true })}
        />
        {errors.num_beds && <p className="text-xs text-destructive">{errors.num_beds.message}</p>}
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
            <SheetTitle className="text-slate-900">
              Send Inquiry — {pgName} {sharingPrefLabel ? `(${sharingPrefLabel})` : ''}
            </SheetTitle>
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
          <DialogTitle className="text-slate-900">
            Send Inquiry — {pgName} {sharingPrefLabel ? `(${sharingPrefLabel})` : ''}
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
