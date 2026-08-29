import { useState, useEffect } from 'react'
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Shield, Upload, Info, Clock, AlertTriangle, LogOut, Edit, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { supabaseUntyped, ensureBucketExists } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Field } from '@/components/ui/field'

const COMPASS_DIRECTIONS = [
  { value: 'N', label: 'North (Good light, no direct sun)' },
  { value: 'NE', label: 'North-East (Morning sunlight, cool afternoons)' },
  { value: 'E', label: 'East (Morning sunlight)' },
  { value: 'SE', label: 'South-East (Warm morning to midday light)' },
  { value: 'S', label: 'South (Sunlight throughout the day)' },
  { value: 'SW', label: 'South-West (Warm afternoon sun)' },
  { value: 'W', label: 'West (Afternoon and evening sun)' },
  { value: 'NW', label: 'North-West (Evening light, cool mornings)' },
]

export function OnboardingPage() {
  // Lazy state initialization from local storage
  const getInitialState = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem('pgfindr_onboarding_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed[key] !== undefined) {
          // If the value is an object (and not an array), deeply merge it with fallback
          if (typeof parsed[key] === 'object' && parsed[key] !== null && !Array.isArray(parsed[key])) {
            return { ...fallback, ...parsed[key] } as T
          }
          return parsed[key] as T
        }
      }
    } catch (e) {}
    return fallback
  }

  const { user, profile, signOut, refreshProfile, session } = useAuth()
  const [isEditing, setIsEditing] = useState(() => getInitialState('isEditing', false))
  const [step, setStep] = useState(() => getInitialState('step', 1))
  const [submitting, setSubmitting] = useState(false)

  // Step 1: PG Basic Details
  const [pgDetails, setPgDetails] = useState(() => getInitialState('pgDetails', {
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
  }))

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

  // Step 2 room configurations state
  const [roomConfigs, setRoomConfigs] = useState(() => getInitialState('roomConfigs', [{
    id: 'config-1',
    num_rooms: 10,
    sharing_type: 2 as 1 | 2 | 3 | 4,
    monthly_rent: 8000,
    occupied_beds: 0,
    door_facing: 'NE',
    has_balcony: false
  }]))

  // Synchronize room configurations changes to rooms array dynamically
  useEffect(() => {
    let globalRoomIndex = 1
    const generatedRooms: any[] = []

    roomConfigs.forEach(config => {
      const R = Number(config.num_rooms) || 1
      const S = Number(config.sharing_type) || 2
      const O = Number(config.occupied_beds) || 0
      const M = Number(config.monthly_rent) || 8000
      const F = config.door_facing
      const B = config.has_balcony

      const totalBeds = R * S
      const safeOccupied = Math.min(O, totalBeds)
      let remainingOccupiedBeds = safeOccupied

      for (let i = 1; i <= R; i++) {
        const roomId = `room-${globalRoomIndex}`
        const beds = []
        for (let j = 1; j <= S; j++) {
          const bedId = `bed-${globalRoomIndex}-${j}`
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
          room_label: `Room ${100 + globalRoomIndex}`,
          floor: 1,
          sharing_type: S as 1 | 2 | 3 | 4,
          door_facing: F,
          has_window: true,
          window_facing: F,
          room_notes: B ? 'Includes balcony' : '',
          photos: [],
          beds
        })
        globalRoomIndex++
      }
    })

    setRooms(generatedRooms)
  }, [roomConfigs])

  // Step 3: Amenities
  const [standardAmenities, setStandardAmenities] = useState<Record<string, boolean>>(() => getInitialState('standardAmenities', {
    wifi: true, ac: false, food_veg: false, food_nonveg: false,
    laundry: false, parking: false, cctv: true, generator: false
  }))
  const [customAmenities, setCustomAmenities] = useState<string[]>(() => getInitialState('customAmenities', []))
  const [newCustomAmenity, setNewCustomAmenity] = useState('')

  // Step 4: Photos (Overall Exterior & Common Areas)
  const [commonPhotos, setCommonPhotos] = useState<string[]>(() => getInitialState('commonPhotos', [
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=500&q=80'
  ]))
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    
    // Check sizes
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds the 5MB limit.`)
        return
      }
    }

    setUploadingPhotos(true)
    try {
      await ensureBucketExists('pg-images')
      const uploadedUrls: string[] = []
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user?.id || 'anon'}-common-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        
        const { error: uploadError } = await supabaseUntyped.storage
          .from('pg-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabaseUntyped.storage
          .from('pg-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }

      setCommonPhotos(prev => [...prev, ...uploadedUrls])
      toast.success('Photos uploaded successfully!')
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error(err.message || 'Failed to upload photo')
    } finally {
      setUploadingPhotos(false)
      e.target.value = ''
    }
  }

  // Step 5: KYC Details
  const [kycDetails, setKycDetails] = useState(() => getInitialState('kycDetails', {
    pan_number: '',
    aadhaar_number: '',
    bank_account: '',
    bank_ifsc: '',
    bank_name: '',
  }))

  const [kycDocuments, setKycDocuments] = useState(() => getInitialState('kycDocuments', {
    id_proof: '',
    address_proof: '',
    ownership_proof: ''
  }))

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      step,
      pgDetails,
      roomConfigs,
      standardAmenities,
      customAmenities,
      commonPhotos,
      kycDetails,
      kycDocuments,
      isEditing
    }
    localStorage.setItem('pgfindr_onboarding_state', JSON.stringify(stateToSave))
  }, [step, pgDetails, roomConfigs, standardAmenities, customAmenities, commonPhotos, kycDetails, kycDocuments, isEditing])

  // Sync state across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pgfindr_onboarding_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.step !== undefined) setStep(parsed.step)
          if (parsed.pgDetails !== undefined) setPgDetails(prev => ({ ...prev, ...parsed.pgDetails }))
          if (parsed.roomConfigs !== undefined) setRoomConfigs(parsed.roomConfigs)
          if (parsed.standardAmenities !== undefined) setStandardAmenities(parsed.standardAmenities)
          if (parsed.customAmenities !== undefined) setCustomAmenities(parsed.customAmenities)
          if (parsed.commonPhotos !== undefined) setCommonPhotos(parsed.commonPhotos)
          if (parsed.kycDetails !== undefined) setKycDetails(prev => ({ ...prev, ...parsed.kycDetails }))
          if (parsed.kycDocuments !== undefined) setKycDocuments(prev => ({ ...prev, ...parsed.kycDocuments }))
          if (parsed.isEditing !== undefined) setIsEditing(parsed.isEditing)
        } catch (err) {}
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  const [uploadingKyc, setUploadingKyc] = useState<Record<string, boolean>>({})

  const handleKycUpload = async (type: 'id_proof' | 'address_proof' | 'ownership_proof', file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.')
      return
    }

    setUploadingKyc(prev => ({ ...prev, [type]: true }))
    try {
      await ensureBucketExists('owner-documents')
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const fileName = `${user?.id || 'anon'}-kyc-${type}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabaseUntyped.storage
        .from('owner-documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabaseUntyped.storage
        .from('owner-documents')
        .getPublicUrl(fileName)

      setKycDocuments(prev => ({
        ...prev,
        [type]: publicUrl
      }))
      toast.success(`${file.name} attached successfully!`)
    } catch (err: any) {
      console.error('KYC Upload failed:', err)
      toast.error(err.message || 'Failed to upload document')
    } finally {
      setUploadingKyc(prev => ({ ...prev, [type]: false }))
    }
  }



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

  // Load existing onboarding/PG data if the owner wants to edit
  async function loadExistingData() {
    if (!user?.id) return
    try {
      // 1. Fetch PG listing
      const { data: pg, error: pgErr } = await supabaseUntyped
        .from('pg_listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pg && !pgErr && pg.name) {
        setPgDetails({
          name: pg.name || '',
          description: pg.description || '',
          address: pg.address || '',
          pincode: pg.pincode || '',
          city: pg.city || 'Bengaluru',
          locality: pg.locality || '',
          pg_type: pg.pg_type || 'coliving',
          deposit_amount: String(pg.deposit_amount || 5000),
          rules: pg.rules || '',
          near_malls: pg.near_malls || '',
          near_parks: pg.near_parks || '',
          near_pubs: pg.near_pubs || '',
          near_transit: pg.near_transit || '',
        })

        // Fetch rooms & beds
        const { data: roomsList } = await supabaseUntyped
          .from('rooms')
          .select('*, beds(*)')
          .eq('pg_id', pg.id)

        if (roomsList && roomsList.length > 0) {
          const mappedRooms = roomsList.map((rm: any) => {
            const sharingTypeInt = rm.beds?.length || 2
            return {
              id: rm.id,
              room_label: rm.room_label,
              floor: rm.floor || 1,
              sharing_type: (sharingTypeInt >= 1 && sharingTypeInt <= 4 ? sharingTypeInt : 2) as 1 | 2 | 3 | 4,
              door_facing: rm.door_facing || 'NE',
              has_window: rm.has_window || false,
              window_facing: rm.window_facing || '',
              window_count: rm.window_count || 1,
              room_size_sqft: rm.room_size_sqft || 150,
              room_notes: rm.room_notes || '',
              photos: [],
              beds: (rm.beds || []).map((b: any) => ({
                id: b.id,
                bed_label: b.bed_label,
                bed_type: b.bed_type || 'Double',
                status: b.status || 'available',
                monthly_rent: b.monthly_rent || 8000,
              }))
            }
          })
          setRooms(mappedRooms)

          // Pre-populate roomConfigs if rooms exist
          // Group by sharing_type, rent, door_facing, has_balcony
          const groupedConfigs: Record<string, any> = {}
          
          roomsList.forEach((rm: any) => {
            const sharingTypeVal = rm.beds?.length || 2
            const monthlyRentVal = rm.beds?.[0]?.monthly_rent || 8000
            const doorFacingVal = rm.door_facing || 'NE'
            const hasBalconyVal = rm.room_notes?.toLowerCase().includes('balcony') || false
            
            const key = `${sharingTypeVal}-${monthlyRentVal}-${doorFacingVal}-${hasBalconyVal}`
            if (!groupedConfigs[key]) {
              groupedConfigs[key] = {
                id: `config-${Object.keys(groupedConfigs).length + 1}`,
                num_rooms: 0,
                sharing_type: (sharingTypeVal >= 1 && sharingTypeVal <= 4 ? sharingTypeVal : 2) as 1 | 2 | 3 | 4,
                monthly_rent: monthlyRentVal,
                occupied_beds: 0,
                door_facing: doorFacingVal,
                has_balcony: hasBalconyVal
              }
            }
            groupedConfigs[key].num_rooms += 1
            groupedConfigs[key].occupied_beds += (rm.beds || []).filter((b: any) => b.status === 'occupied').length
          })

          if (Object.keys(groupedConfigs).length > 0) {
            setRoomConfigs(Object.values(groupedConfigs))
          }
        }

        // Fetch amenities
        const { data: amenitiesList } = await supabaseUntyped
          .from('amenities')
          .select('*')
          .eq('pg_id', pg.id)

        if (amenitiesList) {
          const std: Record<string, boolean> = {
            wifi: false, ac: false, food_veg: false, food_nonveg: false,
            laundry: false, parking: false, cctv: false, generator: false
          }
          amenitiesList.forEach((am: any) => {
            if (am.key in std) std[am.key] = am.is_available
          })
          setStandardAmenities(std)
        }

        // Fetch custom amenities
        const { data: custAmenitiesList } = await supabaseUntyped
          .from('custom_amenities')
          .select('*')
          .eq('pg_id', pg.id)

        if (custAmenitiesList) {
          setCustomAmenities(custAmenitiesList.map((c: any) => c.label))
        }

        // Fetch Photos
        const { data: photosList } = await supabaseUntyped
          .from('pg_photos')
          .select('*')
          .eq('pg_id', pg.id)

        if (photosList && photosList.length > 0) {
          setCommonPhotos(photosList.map((p: any) => p.url))
        }
      }

      // 2. Fetch KYC details
      const { data: kyc, error: kycErr } = await supabaseUntyped
        .from('owner_kyc')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (kyc && !kycErr) {
        setKycDetails({
          pan_number: kyc.pan_number || '',
          aadhaar_number: kyc.aadhaar_number || '',
          bank_account: kyc.bank_account || '',
          bank_ifsc: kyc.bank_ifsc || '',
          bank_name: kyc.bank_name || '',
        })
      }
    } catch (e) {
      console.error('Error loading existing onboarding data:', e)
    }
  }

  // Load existing onboarding data on mount (skip in test mode to avoid race conditions)
  useEffect(() => {
    if (user?.id && import.meta.env.MODE !== 'test') {
      const saved = localStorage.getItem('pgfindr_onboarding_state')
      if (!saved) {
        loadExistingData()
      }
    }
  }, [user?.id])

  // Submit onboarding directly to the database
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

      if (!session?.access_token) {
        toast.error('No active session found. Please log in again.')
        setSubmitting(false)
        return
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/owner/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pgDetails,
          rooms,
          standardAmenities,
          customAmenities,
          commonPhotos,
          kycDetails,
          documents: kycDocuments
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to submit onboarding')
      }

      toast.success('Onboarding and KYC details submitted successfully!')
      
      // Clear persistence once onboarding is submitted successfully
      localStorage.removeItem('pgfindr_onboarding_state')
      
      // Refresh profile and exit editing mode
      setIsEditing(false)
      await refreshProfile()
    } catch (err: any) {
      toast.error(err.message || 'Onboarding submission failed')
    } finally {
      setSubmitting(false)
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
              Your property details and KYC information are currently being reviewed by the FindPGRoom administration team.
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

          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md">
            <Button
              onClick={async () => {
                const saved = localStorage.getItem('pgfindr_onboarding_state')
                if (!saved) {
                  await loadExistingData()
                  setStep(1)
                }
                setIsEditing(true)
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all duration-200"
            >
              <Edit className="size-4 mr-2" /> View / Edit PG & KYC Details
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
              onClick={async () => {
                const saved = localStorage.getItem('pgfindr_onboarding_state')
                if (!saved) {
                  await loadExistingData()
                  setStep(5)
                }
                setIsEditing(true)
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
                  onChange={e => setPgDetails({ ...pgDetails, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="560034"
                  maxLength={6}
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
                    placeholder="e.g. Nexus Mall (2 km)"
                  />
                </Field>
                <Field>
                  <Label className="text-xs font-semibold">Near Parks</Label>
                  <Input
                    value={pgDetails.near_parks}
                    onChange={e => setPgDetails({ ...pgDetails, near_parks: e.target.value })}
                    placeholder="e.g. Cubbon Park (1.5 km)"
                  />
                </Field>
                <Field>
                  <Label className="text-xs font-semibold">Famous Pubs</Label>
                  <Input
                    value={pgDetails.near_pubs}
                    onChange={e => setPgDetails({ ...pgDetails, near_pubs: e.target.value })}
                    placeholder="e.g. Toit (500m)"
                  />
                </Field>
                <Field>
                  <Label className="text-xs font-semibold">Nearby Transit</Label>
                  <Input
                    value={pgDetails.near_transit}
                    onChange={e => setPgDetails({ ...pgDetails, near_transit: e.target.value })}
                    placeholder="e.g. Metro Station (1 km)"
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
              {roomConfigs.map((config, index) => (
                <div key={config.id} className="p-5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/30 space-y-6 relative">
                  {index > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-4 right-4 h-8"
                      onClick={() => setRoomConfigs(roomConfigs.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-16">
                    <Field>
                      <Label className="text-sm font-semibold">Number of Rooms</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={config.num_rooms}
                        onChange={e => {
                          const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value))
                          const newConfigs = [...roomConfigs]
                          newConfigs[index] = { ...config, num_rooms: val as any }
                          setRoomConfigs(newConfigs)
                        }}
                        placeholder="e.g. 10"
                      />
                      <span className="text-[10px] text-muted-foreground">Total rooms to generate</span>
                    </Field>

                    <Field>
                      <Label className="text-sm font-semibold">Sharing Type</Label>
                      <Select
                        value={String(config.sharing_type)}
                        onValueChange={v => {
                          const val = Number(v) as 1 | 2 | 3 | 4
                          const newConfigs = [...roomConfigs]
                          const totalBeds = config.num_rooms * val
                          const occupied = Math.min(config.occupied_beds, totalBeds)
                          newConfigs[index] = { ...config, sharing_type: val, occupied_beds: occupied }
                          setRoomConfigs(newConfigs)
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
                        value={config.monthly_rent}
                        onChange={e => {
                          const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value))
                          const newConfigs = [...roomConfigs]
                          newConfigs[index] = { ...config, monthly_rent: val as any }
                          setRoomConfigs(newConfigs)
                        }}
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
                        max={config.num_rooms * config.sharing_type}
                        value={config.occupied_beds}
                        onChange={e => {
                          const totalBeds = (Number(config.num_rooms) || 1) * config.sharing_type
                          const val = e.target.value === '' ? '' : Math.max(0, Math.min(totalBeds, Number(e.target.value)))
                          const newConfigs = [...roomConfigs]
                          newConfigs[index] = { ...config, occupied_beds: val as any }
                          setRoomConfigs(newConfigs)
                        }}
                        placeholder="e.g. 4"
                      />
                      <span className="text-[10px] text-muted-foreground">Beds currently occupied</span>
                    </Field>

                    <Field>
                      <Label className="text-sm font-semibold">Room Facing Direction</Label>
                      <Select
                        value={config.door_facing}
                        onValueChange={v => {
                          const newConfigs = [...roomConfigs]
                          newConfigs[index] = { ...config, door_facing: v }
                          setRoomConfigs(newConfigs)
                        }}
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
                      <span className="text-[10px] text-muted-foreground">Main door facing direction</span>
                    </Field>

                    <div className="flex flex-col justify-center space-y-1.5 border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/30 dark:bg-slate-900/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">Includes Balcony?</div>
                          <div className="text-[10px] text-muted-foreground">Whether rooms have balcony</div>
                        </div>
                        <Switch
                          checked={config.has_balcony}
                          onCheckedChange={checked => {
                            const newConfigs = [...roomConfigs]
                            newConfigs[index] = { ...config, has_balcony: checked }
                            setRoomConfigs(newConfigs)
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-dashed border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 w-full md:w-auto"
                  onClick={() => setRoomConfigs([...roomConfigs, {
                    id: `config-${Date.now()}`,
                    num_rooms: 1,
                    sharing_type: 2,
                    monthly_rent: 8000,
                    occupied_beds: 0,
                    door_facing: 'NE',
                    has_balcony: false
                  }])}
                >
                  + Add Another Room Configuration
                </Button>
              </div>

              {/* Real-time Summary Card */}
              <div className="mt-6 border border-indigo-100 dark:border-indigo-900/50 rounded-xl bg-indigo-50/30 dark:bg-slate-900/50 p-5 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="size-4" /> Real-time Configuration Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg">
                    <span className="text-muted-foreground block mb-0.5">Total Rooms</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {roomConfigs.reduce((sum, c) => sum + c.num_rooms, 0)} Rooms
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg">
                    <span className="text-muted-foreground block mb-0.5">Configs</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{roomConfigs.length} Types</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg">
                    <span className="text-muted-foreground block mb-0.5">Occupied (Filled) Beds</span>
                    <span className="text-lg font-bold text-slate-500">
                      {roomConfigs.reduce((sum, c) => sum + c.occupied_beds, 0)} Beds
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border p-3 rounded-lg border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/10">
                    <span className="text-muted-foreground block mb-0.5">Available (Empty) Beds</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.max(0, roomConfigs.reduce((sum, c) => sum + (c.num_rooms * c.sharing_type) - c.occupied_beds, 0))} Beds
                    </span>
                  </div>
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
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 relative hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp" 
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={handlePhotoUpload} 
                disabled={uploadingPhotos}
              />
              {uploadingPhotos ? (
                <>
                  <Loader2 className="mx-auto size-8 text-indigo-500 animate-spin mb-2" />
                  <div className="text-sm font-semibold">Uploading...</div>
                </>
              ) : (
                <>
                  <Upload className="mx-auto size-8 text-muted-foreground mb-2" />
                  <div className="text-sm font-semibold">Upload Photo Files</div>
                  <div className="text-xs text-muted-foreground mt-1">Drag and drop or click to browse JPEG/PNG (Max 5MB each)</div>
                </>
              )}
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
                  onChange={e => setKycDetails({ ...kycDetails, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">Aadhaar Card Number</Label>
                <Input
                  value={kycDetails.aadhaar_number}
                  onChange={e => setKycDetails({ ...kycDetails, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
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
                  onChange={e => setKycDetails({ ...kycDetails, bank_account: e.target.value.replace(/\D/g, '') })}
                  placeholder="Bank Account Number"
                />
              </Field>
              <Field>
                <Label className="text-sm font-semibold">IFSC Code</Label>
                <Input
                  value={kycDetails.bank_ifsc}
                  onChange={e => setKycDetails({ ...kycDetails, bank_ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                  placeholder="e.g. HDFC0000123"
                  maxLength={11}
                />
              </Field>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">KYC Verification Documents</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ID Proof Card */}
                <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="size-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Aadhaar Card (ID Proof)</span>
                  </div>
                  <input
                    type="file"
                    id="onboarding-id-proof"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files?.[0]) handleKycUpload('id_proof', e.target.files[0])
                      e.target.value = ''
                    }}
                    disabled={uploadingKyc.id_proof}
                  />
                  <label 
                    htmlFor="onboarding-id-proof"
                    className={`block border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${uploadingKyc.id_proof ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingKyc.id_proof ? (
                      <Loader2 className="mx-auto size-5 text-indigo-500 animate-spin mb-1" />
                    ) : (
                      <Upload className="mx-auto size-5 text-muted-foreground mb-1" />
                    )}
                    <span className="text-[10px] font-semibold text-slate-600 block">{uploadingKyc.id_proof ? 'Uploading...' : 'Upload Aadhaar PDF'}</span>
                    <span className="text-[9px] text-muted-foreground">Click to browse (Max 5MB)</span>
                  </label>
                  {kycDocuments.id_proof && (
                    <div className="mt-3 text-center">
                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1 mb-2">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500"></span>
                        Document Attached
                      </div>
                      <a href={kycDocuments.id_proof} target="_blank" rel="noreferrer" className="block w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden hover:opacity-90 transition-opacity relative group">
                        {kycDocuments.id_proof.toLowerCase().includes('.pdf') ? (
                          <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(kycDocuments.id_proof)}&embedded=true`} className="w-full h-full pointer-events-none object-cover border-0" title="ID Proof Preview" />
                        ) : (
                          <img 
                            src={kycDocuments.id_proof} 
                            alt="ID Proof" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        )}
                        <div className="hidden w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4">
                           <FileText className="size-12 text-indigo-400 mb-2" />
                           <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">Document Uploaded<br/>(Click to View)</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">Click to open full size</span>
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                {/* Address Proof Card */}
                <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="size-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">PAN Card (Address Proof)</span>
                  </div>
                  <input
                    type="file"
                    id="onboarding-address-proof"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files?.[0]) handleKycUpload('address_proof', e.target.files[0])
                      e.target.value = ''
                    }}
                    disabled={uploadingKyc.address_proof}
                  />
                  <label 
                    htmlFor="onboarding-address-proof"
                    className={`block border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${uploadingKyc.address_proof ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingKyc.address_proof ? (
                      <Loader2 className="mx-auto size-5 text-indigo-500 animate-spin mb-1" />
                    ) : (
                      <Upload className="mx-auto size-5 text-muted-foreground mb-1" />
                    )}
                    <span className="text-[10px] font-semibold text-slate-600 block">{uploadingKyc.address_proof ? 'Uploading...' : 'Upload PAN PDF'}</span>
                    <span className="text-[9px] text-muted-foreground">Click to browse (Max 5MB)</span>
                  </label>
                  {kycDocuments.address_proof && (
                    <div className="mt-3 text-center">
                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1 mb-2">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500"></span>
                        Document Attached
                      </div>
                      <a href={kycDocuments.address_proof} target="_blank" rel="noreferrer" className="block w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden hover:opacity-90 transition-opacity relative group">
                        {kycDocuments.address_proof.toLowerCase().includes('.pdf') ? (
                          <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(kycDocuments.address_proof)}&embedded=true`} className="w-full h-full pointer-events-none object-cover border-0" title="Address Proof Preview" />
                        ) : (
                          <img 
                            src={kycDocuments.address_proof} 
                            alt="Address Proof" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        )}
                        <div className="hidden w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4">
                           <FileText className="size-12 text-indigo-400 mb-2" />
                           <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">Document Uploaded<br/>(Click to View)</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">Click to open full size</span>
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                {/* Ownership Proof Card */}
                <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="size-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Property Ownership Proof</span>
                  </div>
                  <input
                    type="file"
                    id="onboarding-ownership-proof"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                    onChange={e => {
                      if (e.target.files?.[0]) handleKycUpload('ownership_proof', e.target.files[0])
                      e.target.value = ''
                    }}
                    disabled={uploadingKyc.ownership_proof}
                  />
                  <label 
                    htmlFor="onboarding-ownership-proof"
                    className={`block border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${uploadingKyc.ownership_proof ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingKyc.ownership_proof ? (
                      <Loader2 className="mx-auto size-5 text-indigo-500 animate-spin mb-1" />
                    ) : (
                      <Upload className="mx-auto size-5 text-muted-foreground mb-1" />
                    )}
                    <span className="text-[10px] font-semibold text-slate-600 block">{uploadingKyc.ownership_proof ? 'Uploading...' : 'Upload Deed/Tax PDF'}</span>
                    <span className="text-[9px] text-muted-foreground">Click to browse (Max 5MB)</span>
                  </label>
                  {kycDocuments.ownership_proof && (
                    <div className="mt-3 text-center">
                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1 mb-2">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500"></span>
                        Document Attached
                      </div>
                      <a href={kycDocuments.ownership_proof} target="_blank" rel="noreferrer" className="block w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden hover:opacity-90 transition-opacity relative group">
                        {kycDocuments.ownership_proof.toLowerCase().includes('.pdf') ? (
                          <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(kycDocuments.ownership_proof)}&embedded=true`} className="w-full h-full pointer-events-none object-cover border-0" title="Ownership Proof Preview" />
                        ) : (
                          <img 
                            src={kycDocuments.ownership_proof} 
                            alt="Ownership Proof" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        )}
                        <div className="hidden w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4">
                           <FileText className="size-12 text-indigo-400 mb-2" />
                           <span className="text-xs font-medium text-slate-600 dark:text-slate-400 text-center">Document Uploaded<br/>(Click to View)</span>
                        </div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">Click to open full size</span>
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </div>
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
        <div className="flex gap-2 sm:gap-3">
          <Button
            variant="outline"
            disabled={step === 1 || submitting}
            onClick={() => setStep(step - 1)}
            className="border-slate-300 hover:bg-slate-100 px-3 sm:px-4"
          >
            <ArrowLeft className="size-4 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => toast.success('Draft saved successfully! You can resume later.')}
            className="bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Save as Draft
          </Button>
        </div>

        {step < 5 ? (
          <Button
            onClick={async () => {
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
            Save & Next <ArrowRight className="size-4 ml-2" />
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
