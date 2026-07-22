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
  const { user, profile, login, register: silentRegister, session } = useAuth()

  // Guest validation states
  const [emailInputValue, setEmailInputValue] = useState('')
  const isEmailVerified = !!user || (emailInputValue.includes('@') && emailInputValue.includes('.'))

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
      const guestPassword = 'password123'
      const guestName = data.full_name.trim()

      toast('Authenticating and submitting inquiry...', { id: 'auth-submit-toast' })

      // First, attempt to sign in (in case user already exists in db)
      const authRes = await login(guestEmail, guestPassword)
      
      if (authRes.error) {
        // If login failed, perform silent registration
        const regRes = await silentRegister({
          email: guestEmail,
          password: guestPassword,
          fullName: guestName,
          role: 'seeker',
          phone: data.mobile
        })

        if (regRes.error) {
          console.warn('Silent registration failed, falling back to local guest session:', regRes.error.message)
        } else {
          // Retry login after registration
          await login(guestEmail, guestPassword)
        }
      }

      // Wait briefly for state synchronization
      await new Promise(resolve => setTimeout(resolve, 100))
      
      let newSession = null
      try {
        const sessionRes = await supabase.auth.getSession()
        newSession = sessionRes.data.session
      } catch (e) {
        console.warn('Failed to fetch session, using local fallback:', e)
      }

      activeUser = newSession?.user || null
      activeSession = newSession

      if (!activeUser) {
        // Mock a guest user session locally for testing / offline demo
        const mockId = '00000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000).toString()
        const mockUser = {
          id: mockId,
          email: guestEmail,
          user_metadata: { full_name: guestName, role: 'seeker' }
        } as any
        const mockSession = {
          access_token: `mock-token-${JSON.stringify({ id: mockId, email: guestEmail, role: 'seeker' })}`,
          user: mockUser
        } as any
        activeUser = mockUser
        activeSession = mockSession
      }
    }

    if (!activeUser) {
      toast.error('User authentication failed')
      return
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
        seeker_id: activeUser.id,
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
    onSuccess(result.id)
    onOpenChange(false)
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Guest Email Field (Unauthenticated Users only) */}
      {!user && (
        <div className="space-y-1.5">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            <span>📧</span> Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={emailInputValue}
            onChange={(e) => setEmailInputValue(e.target.value)}
            className="bg-background text-sm"
          />
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
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Send Inquiry — {pgName}</SheetTitle>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Inquiry — {pgName}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
