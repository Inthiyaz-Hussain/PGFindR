import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Send, User, Phone, CalendarDays, MapPin, Briefcase, Clock, BedSingle, Compass } from 'lucide-react'
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
  4: '4 Sharing',
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
  room_id: z.string().optional(),
  room_facing: z.string().optional(),
  acceptedTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
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

  const hasGoogleAuth = session?.user?.app_metadata?.provider === 'google'

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
      room_id: '',
      occupation: 'Student',
      city_of_origin: '',
      duration_value: 1,
      duration_unit: 'months',
      message: '',
      room_facing: 'Any',
      acceptedTerms: false,
    },
    mode: 'onChange',
  })

  const selectedPref = watch('sharing_preference')

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
        room_id: '',
        occupation: 'Student',
        city_of_origin: '',
        duration_value: 1,
        duration_unit: 'months',
        message: '',
        room_facing: 'Any',
        acceptedTerms: false,
      })
      // No guest email state to reset
    }
  }, [open, profile, sharingTypes, reset, user])



  // Auto-reset room selection if switching sharing preference
  useEffect(() => {
    setValue('room_id', '')
    setValue('num_beds', 1)
  }, [selectedPref, setValue])

  async function onSubmit(data: InquiryFormData) {
    let activeUser = user
    let activeSession = session

    if (!activeUser) {
      // Check if we can get the session directly from supabase
      const { data: { session: latestSession } } = await supabase.auth.getSession()
      if (latestSession) {
        activeUser = latestSession.user
        activeSession = latestSession
      }
    }

    if (!activeUser) {
      toast.error('Authentication session not found. Please log in with Google.')
      return
    }

    if (activeSession?.user?.app_metadata?.provider !== 'google') {
      toast.error('Please sign in with Google to send inquiries')
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
        message: (data.room_facing && data.room_facing !== 'Any' ? `Prefers ${data.room_facing} facing room. ` : '') + (data.message || ''),
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
      {/* Guest/Non-Google Users */}
      {!hasGoogleAuth && (
        <div className="space-y-3.5 p-4 bg-indigo-50/30 dark:bg-slate-800/30 rounded-xl border border-indigo-100/50 dark:border-slate-700/50 text-center">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Google Verification Required
            </h4>
            <p className="text-xs text-muted-foreground">
              Please sign in with Google to verify your identity and submit this inquiry.
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
              onValueChange={(val) => field.onChange(parseInt(val, 10))}
              value={field.value?.toString()}
              className="grid grid-cols-2 gap-2"
            >
              {sharingTypes.map((st) => {
                const isFull = st.total_beds - st.occupied_beds <= 0
                return (
                  <div key={st.id} className="relative">
                    <RadioGroupItem
                      value={st.type.toString()}
                      id={`share-${st.id}`}
                      className="peer sr-only"
                      disabled={isFull}
                    />
                    <Label
                      htmlFor={`share-${st.id}`}
                      className={`flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-transparent p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 peer-data-[state=checked]:border-indigo-600 dark:peer-data-[state=checked]:border-indigo-400 peer-data-[state=checked]:bg-indigo-50/50 dark:peer-data-[state=checked]:bg-indigo-950/20 cursor-pointer transition-all ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-semibold text-sm">{SHARING_LABELS[st.type]}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {isFull ? 'Sold Out' : `${st.total_beds - st.occupied_beds} beds left`}
                      </div>
                    </Label>
                  </div>
                )
              })}
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

      {/* Room Facing */}
      <div className="space-y-1.5">
        <Label htmlFor="room_facing" className="flex items-center gap-1.5">
          <Compass className="size-3.5" /> Room Facing Preference
        </Label>
        <Controller
          name="room_facing"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="room_facing">
                <SelectValue placeholder="Select facing preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="East">East</SelectItem>
                <SelectItem value="West">West</SelectItem>
                <SelectItem value="North">North</SelectItem>
                <SelectItem value="South">South</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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

      {/* Terms and Conditions */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Controller
            name="acceptedTerms"
            control={control}
            render={({ field }) => (
              <input
                type="checkbox"
                id="acceptedTerms"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <Label htmlFor="acceptedTerms" className="text-xs font-normal leading-tight text-slate-500">
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Terms & Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Privacy Policy</a>
          </Label>
        </div>
        {errors.acceptedTerms && <p className="text-xs text-destructive">{errors.acceptedTerms.message}</p>}
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" disabled={isSubmitting || !hasGoogleAuth || !!errors.acceptedTerms}>
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
