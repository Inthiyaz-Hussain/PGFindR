import { useState, useEffect } from 'react'
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Shield, Upload, Info, Clock, AlertTriangle, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'
import { Field } from '@/components/ui/field'

const COMPASS_DIRECTIONS = [
  { value: 'N', label: 'North (Coolest room — least direct sun)' },
  { value: 'NE', label: 'North-East (Morning sun, cool afternoons)' },
  { value: 'E', label: 'East (Morning sunlight)' },
  { value: 'SE', label: 'South-East (Warm morning to midday light)' },
  { value: 'S', label: 'South (Sunlight throughout the day)' },
  { value: 'SW', label: 'South-West (Warm afternoon sun)' },
  { value: 'W', label: 'West (Afternoon and evening sun)' },
  { value: 'NW', label: 'North-West (Evening light, cool mornings)' },
]

export function OnboardingPage() {
  const { user, profile, signOut } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: PG Basic Details
  const [pgDetails, setPgDetails] = useState({
    name: '',
    description: '',
    address: '',
    pincode: '',
    city: 'Bengaluru',
    locality: '',
    pg_type: 'coliving' as 'boys' | 'girls' | 'co-ed' | 'coliving',
    deposit_amount: '5000',
    rules: '',
    near_malls: '',
    near_parks: '',
    near_pubs: '',
    near_transit: '',
  })

  // Step 2: Room & Bed Setup
  const [rooms, setRooms] = useState<Array<{
    id: string
    room_label: string
    floor: number
    sharing_type: 1 | 2 | 3 | 4
    door_facing: string
    has_window: boolean
    window_facing?: string
    window_count?: number
    room_size_sqft?: number
    room_notes?: string
    photos: string[] // Mock URLs/files for onboarding
    beds: Array<{
      id: string
      bed_label: string
      bed_type: 'Single' | 'Double' | 'Bunk Top' | 'Bunk Bottom' | 'Floor Mattress'
      status: 'available' | 'occupied' | 'maintenance'
      monthly_rent: number
    }>
  }>>([
    {
      id: 'room-1',
      room_label: 'Room 101',
      floor: 1,
      sharing_type: 1,
      door_facing: 'NE',
      has_window: true,
      window_facing: 'E',
      window_count: 1,
      room_size_sqft: 150,
      room_notes: 'Spacious balcony room',
      photos: ['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=500&q=80', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'],
      beds: [
        { id: 'bed-1-1', bed_label: 'Bed A', bed_type: 'Single', status: 'available', monthly_rent: 12000 },
      ]
    }
  ])

  // Step 2 bulk configuration state
  const [bulkConfig, setBulkConfig] = useState({
    num_rooms: 10,
    sharing_type: 2 as 1 | 2 | 3 | 4,
    monthly_rent: 8000,
    occupied_beds: 0,
    door_facing: 'NE',
    has_balcony: false
  })

  // Synchronize bulk configuration changes to rooms array dynamically
  useEffect(() => {
    const R = Number(bulkConfig.num_rooms) || 1
    const S = Number(bulkConfig.sharing_type) || 2
    const O = Number(bulkConfig.occupied_beds) || 0
    const M = Number(bulkConfig.monthly_rent) || 8000
    const F = bulkConfig.door_facing
    const B = bulkConfig.has_balcony

    const totalBeds = R * S
    const safeOccupied = Math.min(O, totalBeds)

    let remainingOccupiedBeds = safeOccupied
    const generatedRooms = []

    for (let i = 1; i <= R; i++) {
      const roomId = `room-${i}`
      const beds = []
      for (let j = 1; j <= S; j++) {
        const bedId = `bed-${i}-${j}`
        const isOccupied = remainingOccupiedBeds > 0
        if (isOccupied) {
          remainingOccupiedBeds--
        }
        beds.push({
          id: bedId,
          bed_label: `Bed ${String.fromCharCode(65 + j - 1)}`,
          bed_type: S === 1 ? 'Single' as const : 'Double' as const,
          status: isOccupied ? 'occupied' as const : 'available' as const,
          monthly_rent: M
        })
      }

      generatedRooms.push({
        id: roomId,
        room_label: `Room ${100 + i}`,
        floor: 1,
        sharing_type: S as 1 | 2 | 3 | 4,
        door_facing: F,
        has_window: true,
        window_facing: F,
        room_notes: B ? 'Includes balcony' : '',
        photos: [],
        beds
      })
    }

    setRooms(generatedRooms)
  }, [bulkConfig])

  // Step 3: Amenities
  const [standardAmenities, setStandardAmenities] = useState<Record<string, boolean>>({
    wifi: true, ac: false, food_veg: false, food_nonveg: false,
    laundry: false, parking: false, cctv: true, generator: false
  })
  const [customAmenities, setCustomAmenities] = useState<string[]>([])
  const [newCustomAmenity, setNewCustomAmenity] = useState('')

  // Step 4: Photos (Overall Exterior & Common Areas)
  const [commonPhotos, setCommonPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=500&q=80'
  ])

  // Step 5: KYC Details
  const [kycDetails, setKycDetails] = useState({
    pan_number: '',
    aadhaar_number: '',
    bank_account: '',
    bank_ifsc: '',
    bank_name: '',
  })



  // Custom Amenity addition
  function addCustomAmenity() {
    if (!newCustomAmenity.trim()) return
    if (customAmenities.length >= 10) {
      toast.error('Maximum 10 custom amenities allowed.')
      return
    }
    if (newCustomAmenity.length > 50) {
      toast.error('Label cannot exceed 50 characters.')
      return
    }
    setCustomAmenities([...customAmenities, newCustomAmenity.trim()])
    setNewCustomAmenity('')
  }

  function removeCustomAmenity(index: number) {
    setCustomAmenities(customAmenities.filter((_, i) => i !== index))
  }

  // Submit onboarding & trigger Checkpoint 2 OAuth
  async function handleFinalSubmit() {
    try {
      setSubmitting(true)

      // Validate all required steps data
      if (!pgDetails.name || !pgDetails.address || !pgDetails.locality) {
        toast.error('Please complete PG Basic Details in Step 1.')
        setStep(1)
        setSubmitting(false)
        return
      }

      if (rooms.length === 0) {
        toast.error('Please configure at least one room in Step 2.')
        setStep(2)
        setSubmitting(false)
        return
      }

      if (!kycDetails.pan_number || !kycDetails.aadhaar_number || !kycDetails.bank_account) {
        toast.error('Please complete KYC & Bank details in Step 5.')
        setStep(5)
        setSubmitting(false)
        return
      }

      // 1. Save onboarding state in localStorage so callback page can write to DB on OAuth success
      const onboardingData = {
        pgDetails,
        rooms,
        standardAmenities,
        customAmenities,
        commonPhotos,
        kycDetails,
      }
      localStorage.setItem('owner_onboarding_data', JSON.stringify(onboardingData))

      // 2. Initiate Google OAuth (Checkpoint 2)
      const callbackUrl = `${window.location.origin}/owner/onboarding-callback`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            prompt: 'select_account', // Forces active authentication
          },
        },
      })

      if (error) throw error
      if (data?.url) {
        console.log('Redirecting to Google OAuth re-verification...')
      }
    } catch (err: any) {
      setSubmitting(false)
      toast.error(err.message || 'Onboarding submission failed')
    }
  }

  // If user has completed onboarding but is not approved yet:
  if (profile?.onboarding_verified && !isEditing) {
    const isPending = profile.kyc_status === 'submitted' || profile.kyc_status === 'pending' || !profile.kyc_status
    const isRejected = profile.kyc_status === 'rejected' || profile.kyc_status === 'resubmission_requested'

    if (isPending) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-6 max-w-2xl mx-auto text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-md">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Onboarding Completed!
            </h1>
            <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
              Your property details and KYC information are currently being reviewed by the SwiftPG administration team.
            </p>
          </div>

          <Card className="w-full border-slate-200/80 dark:border-slate-800/80 shadow-lg p-6 bg-slate-50/50 dark:bg-slate-900/50">
            <CardContent className="space-y-4 pt-4 text-left text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">Verification Status</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full text-xs">
                  Pending Admin Approval
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">Owner Name</span>
                <span className="font-medium">{profile.full_name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-semibold">Registered Email</span>
                <span className="font-medium">{user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-slate-500 font-semibold">Contact Phone</span>
                <span className="font-medium">{profile.phone || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <div className="bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300 p-4 rounded-xl text-xs text-left flex gap-3 max-w-lg">
            <Info className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p>
              Once approved, your PG listing will go live and you will receive full access to your owner dashboard. This review typically takes up to 48 hours.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs">
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 border-slate-300 dark:border-slate-850 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
            >
              <LogOut className="size-4" /> Sign Out
            </Button>
          </div>
        </div>
      )
    }

    if (isRejected) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-6 max-w-2xl mx-auto text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-md">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
              KYC Resubmission Required
            </h1>
            <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base">
              The administrator has reviewed your details and requested some changes before giving approval.
            </p>
          </div>

          <Card className="w-full border-red-200 dark:border-red-900/30 shadow-lg p-6 bg-red-50/10 dark:bg-red-950/5">
            <CardContent className="space-y-4 pt-4 text-left text-sm">
              <div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-1">
                  Administrator Review Feedback:
                </span>
                <div className="p-4 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/40 rounded-lg text-slate-700 dark:text-slate-350 italic">
                  "{profile.kyc_notes || 'Please verify and correct your KYC documentation/bank details.'}"
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md pt-2">
            <Button
              onClick={() => {
                // Populate wizard state with profile info if they want to edit
                if (profile.bank_account_number) {
                  setKycDetails(prev => ({
                    ...prev,
                    bank_account: profile.bank_account_number || '',
                    bank_ifsc: profile.bank_ifsc || '',
                    bank_name: profile.bank_holder_name || ''
                  }))
                }
                setIsEditing(true)
                setStep(5) // Start directly at KYC details step
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all duration-200"
            >
              Update KYC & Bank Details
            </Button>
            <Button
              variant="outline"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 border-slate-300 dark:border-slate-850 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
            >
              <LogOut className="size-4" /> Sign Out
            </Button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header & Progress */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">PG Setup & Onboarding</h1>
        <p className="text-slate-500">Complete these 5 steps to submit your property list to our admin desk.</p>
        <div className="space-y-1 pt-2">
          <div className="flex justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Step {step} of 5</span>
            <span>{Math.round((step / 5) * 100)}% Complete</span>
          </div>
          <Progress value={(step / 5) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>

      {/* Step Components */}
      {step === 1 && (
        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <CardHeader>
            <CardTitle>Step 1 — PG Basic Information</CardTitle>
            <CardDescription>Enter the basic branding and location details of your PG listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label className="text-sm font-semibold">PG Name</Label>
                <Input
                  value={pgDetails.name}
                  onChange={e => setPgDetails({ ...pgDetails, name: e.target.value })}
                  placeholder="e.g. Royal Living PG"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">PG Type (Gender Preference)</Label>
                <Select
                  value={pgDetails.pg_type}
                  onValueChange={v => setPgDetails({ ...pgDetails, pg_type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boys">Boys only</SelectItem>
                    <SelectItem value="girls">Girls only</SelectItem>
                    <SelectItem value="coliving">Coliving</SelectItem>
                    {pgDetails.pg_type === 'co-ed' && (
                      <SelectItem value="co-ed">Co-ed (Legacy)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <Label className="text-sm font-semibold">Detailed Address</Label>
              <Input
                value={pgDetails.address}
                onChange={e => setPgDetails({ ...pgDetails, address: e.target.value })}
                placeholder="Door No, Street Name, Landmark..."
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field>
                <Label className="text-sm font-semibold">City</Label>
                <Input
                  value={pgDetails.city}
                  onChange={e => setPgDetails({ ...pgDetails, city: e.target.value })}
                  placeholder="Bengaluru"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">Locality / Area</Label>
                <Input
                  value={pgDetails.locality}
                  onChange={e => setPgDetails({ ...pgDetails, locality: e.target.value })}
                  placeholder="e.g. Koramangala 4th Block"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">Pincode</Label>
                <Input
                  value={pgDetails.pincode}
                  onChange={e => setPgDetails({ ...pgDetails, pincode: e.target.value })}
                  placeholder="560034"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">Standard Deposit Amount (₹)</Label>
                <Input
                  type="number"
                  value={pgDetails.deposit_amount}
                  onChange={e => setPgDetails({ ...pgDetails, deposit_amount: e.target.value })}
                  placeholder="5000"
                />
              </Field>
            </div>

            <Field>
              <Label className="text-sm font-semibold">Description</Label>
              <Textarea
                value={pgDetails.description}
                onChange={e => setPgDetails({ ...pgDetails, description: e.target.value })}
                placeholder="Highlight your PG facilities, nearby bus stations/metro links, etc."
                rows={3}
              />
            </Field>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-semibold text-sm">Nearby Attractions & Landmarks</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field>
                  <Label className="text-xs font-semibold">Near Malls</Label>
                  <Input
                    value={pgDetails.near_malls}
                    onChange={e => setPgDetails({ ...pgDetails, near_malls: e.target.value })}
                    placeholder="e.g. Nexus Mall"
                  />
                </Field>
                <Field>
                  <Label className="text-xs font-semibold">Near Parks</Label>
                  <Input
                    value={pgDetails.near_parks}
                    onChange={e => setPgDetails({ ...pgDetails, near_parks: e.target.value })}
                    placeholder="e.g. Cubbon Park"
                  />
                </Field>
                <Field>
                  <Label className="text-xs font-semibold">Famous Pubs</Label>
                  <Input
                    value={pgDetails.near_pubs}
                    onChange={e => setPgDetails({ ...pgDetails, near_pubs: e.target.value })}
                    placeholder="e.g. Toit, Windmills"
                  />
                </Field>
                <Field>
                  <Label className="text-xs font-semibold">Nearby Transit</Label>
                  <Input
                    value={pgDetails.near_transit}
                    onChange={e => setPgDetails({ ...pgDetails, near_transit: e.target.value })}
                    placeholder="e.g. Metro Station"
                  />
                </Field>
              </div>
            </div>

            <Field>
              <Label className="text-sm font-semibold">PG Rules (Optional)</Label>
              <Textarea
                value={pgDetails.rules}
                onChange={e => setPgDetails({ ...pgDetails, rules: e.target.value })}
                placeholder="e.g. No noise after 10 PM. Visitors allowed until 8 PM."
                rows={2}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-lg">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl font-bold text-indigo-950 dark:text-slate-100">Step 2 — Room & Bed Configuration</CardTitle>
              <CardDescription>
                Configure the standard rooms and beds layout of your PG in bulk. We will generate the detailed room inventory automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field>
                  <Label className="text-sm font-semibold">Number of Rooms</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={bulkConfig.num_rooms}
                    onChange={e => {
                      const val = Math.max(1, Number(e.target.value) || 1)
                      setBulkConfig({ ...bulkConfig, num_rooms: val })
                    }}
                    placeholder="e.g. 10"
                  />
                  <span className="text-[10px] text-muted-foreground">Total rooms to generate in this PG</span>
                </Field>

                <Field>
                  <Label className="text-sm font-semibold">Sharing Type</Label>
                  <Select
                    value={String(bulkConfig.sharing_type)}
                    onValueChange={v => {
                      const val = Number(v) as 1 | 2 | 3 | 4
                      setBulkConfig(prev => {
                        const totalBeds = prev.num_rooms * val
                        const occupied = Math.min(prev.occupied_beds, totalBeds)
                        return { ...prev, sharing_type: val, occupied_beds: occupied }
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1-Share (Single)</SelectItem>
                      <SelectItem value="2">2-Share (Double)</SelectItem>
                      <SelectItem value="3">3-Share (Triple)</SelectItem>
                      <SelectItem value="4">4-Share (Quadruple)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">Beds count per standard room</span>
                </Field>

                <Field>
                  <Label className="text-sm font-semibold">Monthly Rent per Bed (₹)</Label>
                  <Input
                    type="number"
                    min="100"
                    value={bulkConfig.monthly_rent}
                    onChange={e => setBulkConfig({ ...bulkConfig, monthly_rent: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="e.g. 8000"
                  />
                  <span className="text-[10px] text-muted-foreground">Base rent per bed per month</span>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <Field>
                  <Label className="text-sm font-semibold">Occupied (Filled) Beds</Label>
                  <Input
                    type="number"
                    min="0"
                    max={bulkConfig.num_rooms * bulkConfig.sharing_type}
                    value={bulkConfig.occupied_beds}
                    onChange={e => {
                      const totalBeds = bulkConfig.num_rooms * bulkConfig.sharing_type
                      const val = Math.max(0, Math.min(totalBeds, Number(e.target.value) || 0))
                      setBulkConfig({ ...bulkConfig, occupied_beds: val })
                    }}
                    placeholder="e.g. 4"
                  />
                  <span className="text-[10px] text-muted-foreground">Beds currently occupied by tenants</span>
                </Field>

                <Field>
                  <Label className="text-sm font-semibold">Room Facing Direction</Label>
                  <Select
                    value={bulkConfig.door_facing}
                    onValueChange={v => setBulkConfig({ ...bulkConfig, door_facing: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPASS_DIRECTIONS.map(dir => (
                        <SelectItem key={dir.value} value={dir.value}>{dir.value} - {dir.label.split(' (')[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">Main door facing direction of rooms</span>
                </Field>

                <div className="flex flex-col justify-center space-y-1.5 border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/30 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Includes Balcony?</div>
                      <div className="text-[10px] text-muted-foreground">Whether rooms have balcony access</div>
                    </div>
                    <Switch
                      checked={bulkConfig.has_balcony}
                      onCheckedChange={checked => setBulkConfig({ ...bulkConfig, has_balcony: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Summary Card */}
              <div className="mt-6 border border-indigo-100 dark:border-indigo-900/50 rounded-xl bg-indigo-50/30 dark:bg-slate-900/50 p-5 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="size-4" /> Real-time Configuration Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg">
                    <span className="text-muted-foreground block mb-0.5">Total Rooms</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{bulkConfig.num_rooms} Rooms</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg">
                    <span className="text-muted-foreground block mb-0.5">Sharing Mode</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{bulkConfig.sharing_type}-Share</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg">
                    <span className="text-muted-foreground block mb-0.5">Occupied (Filled) Beds</span>
                    <span className="text-lg font-bold text-slate-500">{bulkConfig.occupied_beds} Beds</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/10">
                    <span className="text-muted-foreground block mb-0.5">Available (Empty) Beds</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.max(0, bulkConfig.num_rooms * bulkConfig.sharing_type - bulkConfig.occupied_beds)} Beds
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Room Facing: <strong>{bulkConfig.door_facing}</strong></span>
                  <span>•</span>
                  <span>Balcony Access: <strong>{bulkConfig.has_balcony ? 'Yes' : 'No'}</strong></span>
                  <span>•</span>
                  <span>Calculated Total Beds: <strong>{bulkConfig.num_rooms * bulkConfig.sharing_type}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <CardHeader>
            <CardTitle>Step 3 — Amenities Setup</CardTitle>
            <CardDescription>Check standard amenities and add custom offerings that differentiate your PG.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-bold mb-3 block">Standard Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'wifi', label: 'WiFi' },
                  { key: 'ac', label: 'Air Conditioning' },
                  { key: 'food_veg', label: 'Veg Food' },
                  { key: 'food_nonveg', label: 'Non-Veg Food' },
                  { key: 'laundry', label: 'Laundry' },
                  { key: 'parking', label: 'Parking' },
                  { key: 'cctv', label: 'CCTV' },
                  { key: 'generator', label: 'Power Backup' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 select-none">
                    <input
                      type="checkbox"
                      checked={standardAmenities[key]}
                      onChange={e => setStandardAmenities({ ...standardAmenities, [key]: e.target.checked })}
                      className="size-4 text-indigo-600 rounded border-slate-300"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-5">
              <Label className="text-sm font-bold mb-1.5 block">Custom Amenities (Max 10)</Label>
              <div className="flex gap-2 mb-4">
                <Input
                  value={newCustomAmenity}
                  onChange={e => setNewCustomAmenity(e.target.value)}
                  placeholder="e.g. Study Table, Water Purifier, Gym Access"
                  maxLength={50}
                />
                <Button onClick={addCustomAmenity} className="bg-slate-900 text-white hover:bg-slate-800 shrink-0">
                  Add Amenity
                </Button>
              </div>

              {customAmenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customAmenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-indigo-100 dark:border-indigo-900">
                      <span>{amenity}</span>
                      <button type="button" onClick={() => removeCustomAmenity(index)} className="hover:text-red-500 font-bold ml-1 text-[13px]">×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="size-3.5" /> No custom amenities added yet. Highlight unique selling points here!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <CardHeader>
            <CardTitle>Step 4 — Photos Upload</CardTitle>
            <CardDescription>Upload attractive photos of your PG building exterior and common rooms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer">
              <Upload className="mx-auto size-8 text-muted-foreground mb-2" />
              <div className="text-sm font-semibold">Upload Photo Files</div>
              <div className="text-xs text-muted-foreground mt-1">Drag and drop or click to browse JPEG/PNG (Max 5MB each)</div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-muted-foreground">Default Showcase Photos:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {commonPhotos.map((url, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border aspect-video shadow-xs group">
                    <img src={url} alt={`Common ${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCommonPhotos(commonPhotos.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 size-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <CardHeader>
            <CardTitle>Step 5 — KYC & Bank Registration</CardTitle>
            <CardDescription>Provide mandatory verification details to enable payout checks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label className="text-sm font-semibold">PAN Card Number</Label>
                <Input
                  value={kycDetails.pan_number}
                  onChange={e => setKycDetails({ ...kycDetails, pan_number: e.target.value })}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">Aadhaar Card Number</Label>
                <Input
                  value={kycDetails.aadhaar_number}
                  onChange={e => setKycDetails({ ...kycDetails, aadhaar_number: e.target.value })}
                  placeholder="12-digit number"
                  maxLength={12}
                />
              </Field>
            </div>

            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field>
                <Label className="text-sm font-semibold">Bank Name</Label>
                <Input
                  value={kycDetails.bank_name}
                  onChange={e => setKycDetails({ ...kycDetails, bank_name: e.target.value })}
                  placeholder="HDFC Bank"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">Account Number</Label>
                <Input
                  value={kycDetails.bank_account}
                  onChange={e => setKycDetails({ ...kycDetails, bank_account: e.target.value })}
                  placeholder="Bank Account Number"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">IFSC Code</Label>
                <Input
                  value={kycDetails.bank_ifsc}
                  onChange={e => setKycDetails({ ...kycDetails, bank_ifsc: e.target.value })}
                  placeholder="e.g. HDFC0000123"
                  maxLength={11}
                />
              </Field>
            </div>

            {/* Admin safety note */}
            <div className="flex gap-3 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 p-4 rounded-xl text-xs border border-amber-200/50 dark:border-amber-900/50">
              <Shield className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Security Note:</span> Your KYC details are encrypted and stored securely. Payout commissions are calculated dynamically based on these records.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wizard Footer Buttons */}
      <div className="flex justify-between items-center border-t pt-5">
        <Button
          variant="outline"
          disabled={step === 1 || submitting}
          onClick={() => setStep(step - 1)}
          className="border-slate-300 hover:bg-slate-100"
        >
          <ArrowLeft className="size-4 mr-2" /> Back
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => {
              if (step === 1) {
                const missingFields: string[] = []
                if (!pgDetails.name.trim()) missingFields.push('name')
                if (!pgDetails.address.trim()) missingFields.push('address')
                if (!pgDetails.city.trim()) missingFields.push('city')
                if (!pgDetails.locality.trim()) missingFields.push('locality')

                if (missingFields.length > 0) {
                  toast.error('Please fill in all required fields.')
                  
                  setTimeout(() => {
                    const firstEmptyName = missingFields[0]
                    const selectorMap: Record<string, string> = {
                      name: 'input[placeholder*="Royal Living"]',
                      address: 'input[placeholder*="Door No"]',
                      city: 'input[placeholder*="Bengaluru"]',
                      locality: 'input[placeholder*="Koramangala"]',
                    }
                    const selector = selectorMap[firstEmptyName]
                    const inputElement = document.querySelector(selector) as HTMLElement
                    if (inputElement) {
                      const fieldParent = inputElement.closest('[role="group"]') || inputElement.parentElement
                      if (fieldParent) {
                        fieldParent.setAttribute('data-invalid', 'true')
                        if (typeof fieldParent.scrollIntoView === 'function') {
                          fieldParent.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                        setTimeout(() => {
                          fieldParent.removeAttribute('data-invalid')
                        }, 3600)
                      }
                      inputElement.focus()
                    }
                  }, 100)
                  return
                }
              }
              setStep(step + 1)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            Next <ArrowRight className="size-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleFinalSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            {submitting ? 'Submitting…' : 'Submit for Admin Approval'}
          </Button>
        )}
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block font-medium text-slate-700 dark:text-slate-200 mb-1.5 ${className}`}>{children}</label>
}
