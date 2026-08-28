import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Save, Upload, X, MapPin, Plus, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseUntyped, ensureBucketExists } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { PGType, SharingTypeItem, AmenityItem } from '@/types'
import { cn } from '@/lib/utils'

const pgSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().max(500).optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  locality: z.string().min(2, 'Locality is required'),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  pg_type: z.enum(['boys', 'girls', 'co-ed', 'coliving']),
  deposit_amount: z.number().nullable().optional(),
  food_included: z.boolean(),
  wifi_included: z.boolean(),
  ac_rooms: z.boolean(),
  parking: z.boolean(),
  laundry: z.boolean(),
  security_24x7: z.boolean(),
  rules: z.string().optional(),
  pincode: z.string().optional(),
  near_malls: z.string().optional(),
  near_parks: z.string().optional(),
  near_pubs: z.string().optional(),
  near_transit: z.string().optional(),
})

type PGFormData = z.infer<typeof pgSchema>

const AMENITY_KEYS: { key: AmenityItem['key']; label: string }[] = [
  { key: 'wifi', label: 'WiFi' },
  { key: 'ac', label: 'Air Conditioning' },
  { key: 'food_veg', label: 'Veg Food' },
  { key: 'food_nonveg', label: 'Non-Veg Food' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'parking', label: 'Parking' },
  { key: 'cctv', label: 'CCTV Surveillance' },
  { key: 'generator', label: 'Power Backup' },
]

export function PGFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const { user, profile, session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin' || window.location.pathname.startsWith('/admin')

  const [ownerMode, setOwnerMode] = useState<'select' | 'create' | 'edit'>(isNew ? 'select' : 'edit')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newOwnerPassword, setNewOwnerPassword] = useState('')
  const [newOwnerPhone, setNewOwnerPhone] = useState('')
  const [newOwnerPhoneAlternate, setNewOwnerPhoneAlternate] = useState('')

  const [filterCity, setFilterCity] = useState<string>('')
  const [filterLocality, setFilterLocality] = useState<string>('')

  const [sharingTypes, setSharingTypes] = useState<{ type: 1 | 2 | 3 | 4; price_monthly: string; price_daily: string; total_beds: string }[]>([])
  const [amenities, setAmenities] = useState<Record<AmenityItem['key'], boolean>>({
    wifi: false, ac: false, food_veg: false, food_nonveg: false,
    laundry: false, parking: false, cctv: false, generator: false,
  })
  const [photos, setPhotos] = useState<{ url: string; type: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom'; caption?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Query all owners for admin dropdown
  const { data: owners } = useQuery({
    queryKey: ['admin-owners-list'],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('profiles')
        .select('id, full_name, phone, phone_alternate, email')
        .eq('role', 'owner')
        .order('full_name')
      return data || []
    },
    enabled: isAdmin,
  })

  useEffect(() => {
    if (isAdmin && owners && owners.length > 0) {
      if (ownerMode === 'select' || ownerMode === 'edit') {
        if (selectedOwnerId) {
          const owner = (owners || []).find((o: any) => o.id === selectedOwnerId)
          if (owner) {
            setNewOwnerName(owner.full_name || '')
            setNewOwnerPhone(owner.phone || '')
            setNewOwnerPhoneAlternate(owner.phone_alternate || '')
            setNewOwnerEmail(owner.email || '')
          }
        } else {
          setNewOwnerName('')
          setNewOwnerPhone('')
          setNewOwnerPhoneAlternate('')
          setNewOwnerEmail('')
        }
      }
    }
  }, [selectedOwnerId, owners, isAdmin, ownerMode])

  // Query all listings for owner filter
  const { data: pgListingsFilter } = useQuery({
    queryKey: ['admin-pg-listings-filter'],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('pg_listings')
        .select('owner_id, city, locality')
      return data || []
    },
    enabled: isAdmin,
  })

  const uniqueCities = useMemo(() => {
    return Array.from(
      new Set((pgListingsFilter || []).map((l: any) => l.city).filter(Boolean))
    ).sort() as string[]
  }, [pgListingsFilter])

  const uniqueLocalities = useMemo(() => {
    if (!filterCity || filterCity === 'all-cities') return []
    return Array.from(
      new Set(
        (pgListingsFilter || [])
          .filter((l: any) => l.city === filterCity)
          .map((l: any) => l.locality)
          .filter(Boolean)
      )
    ).sort() as string[]
  }, [pgListingsFilter, filterCity])

  const filteredOwners = useMemo(() => {
    if (!owners) return []
    const hasCityFilter = filterCity && filterCity !== 'all-cities'
    const hasLocalityFilter = filterLocality && filterLocality !== 'all-localities'

    if (!hasCityFilter) return owners

    const matchingListings = (pgListingsFilter || []).filter((l: any) => {
      const matchCity = l.city === filterCity
      const matchLocality = hasLocalityFilter ? l.locality === filterLocality : true
      return matchCity && matchLocality
    })
    const matchingOwnerIds = new Set(matchingListings.map((l: any) => l.owner_id))

    return owners.filter((o: any) => matchingOwnerIds.has(o.id) || o.id === selectedOwnerId)
  }, [owners, pgListingsFilter, filterCity, filterLocality, selectedOwnerId])

  const form = useForm<PGFormData>({
    resolver: zodResolver(pgSchema),
    defaultValues: {
      name: '', description: '', address: '', city: '', locality: '',
      pg_type: 'coliving', deposit_amount: 0,
      food_included: false, wifi_included: false, ac_rooms: false,
      parking: false, laundry: false, security_24x7: false, rules: '',
      pincode: '', near_malls: '', near_parks: '', near_pubs: '', near_transit: '',
    },
  })

  const watchedCity = form.watch('city')
  const watchedLocality = form.watch('locality')
  const watchedPgType = form.watch('pg_type')

  useEffect(() => {
    if (watchedCity) {
      setFilterCity(watchedCity)
    }
  }, [watchedCity])

  useEffect(() => {
    if (watchedLocality) {
      setFilterLocality(watchedLocality)
    }
  }, [watchedLocality])

  useEffect(() => {
    if (watchedPgType === 'coliving' || watchedPgType === 'co-ed') {
      // Force all sharing types to type 1 (Single)
      setSharingTypes((prev) =>
        prev.map((st) => st.type !== 1 ? { ...st, type: 1 } : st)
      )
    }
  }, [watchedPgType])

  // Load existing data for edit
  useQuery({
    queryKey: ['pg-edit', id],
    queryFn: async () => {
      const { data: pg } = await supabaseUntyped.from('pg_listings').select('*').eq('id', id!).single()
      if (pg) {
        const p = pg as Record<string, unknown>
        if (p.owner_id) {
          setSelectedOwnerId(p.owner_id as string)
        }
        form.reset({
          name: p.name as string,
          description: (p.description as string) || '',
          address: p.address as string,
          city: p.city as string,
          locality: p.locality as string,
          pg_type: p.pg_type as PGType,
          deposit_amount: p.deposit_amount as number,
          food_included: p.food_included as boolean,
          wifi_included: p.wifi_included as boolean,
          ac_rooms: p.ac_rooms as boolean,
          parking: p.parking as boolean,
          laundry: p.laundry as boolean,
          security_24x7: p.security_24x7 as boolean,
          rules: (p.rules as string) || '',
          latitude: p.latitude as number | undefined,
          longitude: p.longitude as number | undefined,
          pincode: (p.pincode as string) || '',
          near_malls: (p.near_malls as string) || '',
          near_parks: (p.near_parks as string) || '',
          near_pubs: (p.near_pubs as string) || '',
          near_transit: (p.near_transit as string) || '',
        })
      }

      const { data: sharingData } = await supabaseUntyped.from('sharing_types').select('*').eq('pg_id', id!)
      if (sharingData) {
        setSharingTypes((sharingData as SharingTypeItem[]).map((s) => ({
          type: s.type,
          price_monthly: String(s.price_monthly),
          price_daily: String(s.price_daily || ''),
          total_beds: String(s.total_beds),
        })))
      }

      const { data: amenityData } = await supabaseUntyped.from('amenities').select('*').eq('pg_id', id!)
      if (amenityData) {
        const newAmenities = { ...amenities }
        ;(amenityData as AmenityItem[]).forEach((a) => { newAmenities[a.key] = a.is_available })
        setAmenities(newAmenities)
      }

      const { data: photoData } = await supabaseUntyped.from('pg_photos').select('*').eq('pg_id', id!)
      if (photoData) {
        setPhotos(photoData.map((p: Record<string, unknown>) => ({
          url: p.url as string,
          type: (p.type as 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom') || 'room',
          caption: (p.caption as string) || undefined,
        })))
      }

      return pg
    },
    enabled: !isNew && !!id,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: PGFormData) => {
      let finalOwnerId = user!.id

      if (isAdmin) {
        if (ownerMode === 'create') {
          if (!newOwnerName || !newOwnerEmail || !newOwnerPassword) {
            throw new Error('Please fill in the Owner Name, Email, and Password to create a new owner.')
          }

          const token = session?.access_token
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/auth/admin/create-owner`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              name: newOwnerName,
              email: newOwnerEmail,
              password: newOwnerPassword,
              mobile: newOwnerPhone || undefined,
              phone_alternate: newOwnerPhoneAlternate || undefined,
            })
          })

          const resData = await res.json()
          if (!res.ok) {
            throw new Error(resData.error || 'Failed to create new owner')
          }
          finalOwnerId = resData.user.id
        } else if (ownerMode === 'edit') {
          if (!newOwnerName) {
            throw new Error('Owner Full Name is required.')
          }
          const { error: updateErr } = await supabaseUntyped
            .from('profiles')
            .update({
              full_name: newOwnerName,
              phone: newOwnerPhone || null,
              phone_alternate: newOwnerPhoneAlternate || null,
            })
            .eq('id', selectedOwnerId)

          if (updateErr) {
            throw new Error(`Failed to update owner profile: ${updateErr.message}`)
          }
          finalOwnerId = selectedOwnerId
        } else {
          if (!selectedOwnerId) {
            throw new Error('Please select an owner for this PG listing.')
          }
          finalOwnerId = selectedOwnerId
        }
      }

      // If pg_type is coliving, we only allow type 1 (Single) sharing types to be saved
      const finalSharingTypes = data.pg_type === 'coliving'
        ? sharingTypes.filter((s) => s.type === 1)
        : sharingTypes;

      const payload: any = {
        ...data,
        owner_id: finalOwnerId,
        monthly_rent_min: finalSharingTypes.length > 0 ? Math.min(...finalSharingTypes.map((s) => Number(s.price_monthly) || 0)) : 0,
        monthly_rent_max: finalSharingTypes.length > 0 ? Math.max(...finalSharingTypes.map((s) => Number(s.price_monthly) || 0)) : 0,
        total_beds: finalSharingTypes.reduce((sum, s) => sum + (Number(s.total_beds) || 0), 0),
        available_beds: finalSharingTypes.reduce((sum, s) => sum + (Number(s.total_beds) || 0), 0),
        updated_at: new Date().toISOString(),
      }

      if (isNew) {
        payload.status = isAdmin ? 'approved' : 'pending'
      }

      // Save listing and all relations atomically via the server to bypass RLS/Mock-auth limitations
      const token = session?.access_token
      const saveRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/pg/save-listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id,
          payload,
          sharingTypes: finalSharingTypes,
          amenities,
          photos,
          isAdmin
        })
      })

      const saveResData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveResData.error || 'Failed to save listing details')
      }

      return saveResData.pgId
    },
    onSuccess: (pgId) => {
      queryClient.invalidateQueries({ queryKey: ['owner-listings'] })
      queryClient.invalidateQueries({ queryKey: ['owner-pgs'] })
      toast.success(isNew ? 'PG created! Pending admin approval.' : 'Listing updated!')
      const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/owner'
      if (isNew && basePath === '/owner') {
        navigate(`/owner/pgs/${pgId}/availability`)
      } else {
        navigate(`${basePath}/pgs`)
      }
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(err.message || 'Failed to save listing')
    },
  })

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!user) return
    setUploading(true)
    setUploadProgress(0)

    try {
      // Ensure the pg-images bucket exists on Supabase (safely handled client-side if permissions allow)
      await ensureBucketExists('pg-images')

      const uploadedUrls: string[] = []
      const totalFiles = files.length

      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf']

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 1. Validate file extension and MIME type
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        if (!fileExt || !allowedExtensions.includes(fileExt) || !allowedMimeTypes.includes(file.type)) {
          throw new Error(`Unsupported file type for "${file.name}". Only PDF, JPG, JPEG, and PNG formats are allowed.`)
        }

        // 2. Enforce maximum file size limit of 5MB before submission
        const maxSizeBytes = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSizeBytes) {
          throw new Error(`File "${file.name}" exceeds the 5MB size limit. Please upload a smaller file.`)
        }

        const fileToUpload = file

        // 4. Generate a unique filename to avoid collisions
        const uniqueFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileToUpload.name.split('.').pop()?.toLowerCase()}`

        // 5. Upload directly to Supabase Storage pg-images bucket
        const { error: uploadError } = await supabase.storage
          .from('pg-images')
          .upload(uniqueFileName, fileToUpload, {
            cacheControl: '3600',
            upsert: true,
            contentType: fileToUpload.type,
          })

        if (uploadError) {
          throw new Error(`Upload failed for "${file.name}": ${uploadError.message}`)
        }

        // 6. Retrieve the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('pg-images')
          .getPublicUrl(uniqueFileName)

        if (!publicUrl) {
          throw new Error(`Failed to get public URL for "${file.name}".`)
        }

        uploadedUrls.push(publicUrl)
        setUploadProgress(((i + 1) / totalFiles) * 100)
      }

      setPhotos((prev) => [...prev, ...uploadedUrls.map((url) => ({ url, type: 'room' as const }))])
      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully.`)
    } catch (err: any) {
      console.error('File upload error:', err)
      toast.error(`Upload failed: ${err.message || err}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [user])

  const addSharingType = () => {
    if (sharingTypes.length >= 4) return
    const existingTypes = sharingTypes.map((s) => s.type)
    const available: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4].filter((t) => !existingTypes.includes(t as 1 | 2 | 3 | 4)) as (1 | 2 | 3 | 4)[]
    if (available.length > 0) {
      setSharingTypes([...sharingTypes, { type: available[0], price_monthly: '', price_daily: '', total_beds: '' }])
    }
  }

  const removeSharingType = (index: number) => {
    setSharingTypes(sharingTypes.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  const onInvalidSubmit = (errors: any) => {
    console.warn('Form validation errors:', errors)
    const errorKeys = Object.keys(errors)
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0]
      const errorMessage = errors[firstErrorKey]?.message || 'Required field missing'
      toast.error(`Please complete all required fields: ${errorMessage}`)

      // Scroll to the first element with validation error and focus it
      setTimeout(() => {
        const firstErrField = document.querySelector('[data-invalid="true"]')
        if (firstErrField) {
          firstErrField.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const input = firstErrField.querySelector('input, select, textarea, button[role="combobox"]') as HTMLElement
          if (input) {
            input.focus()
          }
        }
      }, 100)
    }
  }

  const onValidSubmit = async (data: PGFormData) => {
    if (isAdmin) {
      if (ownerMode === 'create') {
        const missing: string[] = []
        if (!newOwnerName.trim()) missing.push('new-owner-name')
        if (!newOwnerEmail.trim()) missing.push('new-owner-email')
        if (!newOwnerPassword.trim()) missing.push('new-owner-password')

        if (missing.length > 0) {
          toast.error('Please fill in the Owner Name, Email, and Password.')
          setTimeout(() => {
            const firstEmpty = missing[0]
            const el = document.getElementById(firstEmpty) as HTMLElement
            if (el) {
              const field = el.closest('[role="group"]') || el.parentElement
              if (field) {
                field.setAttribute('data-invalid', 'true')
                field.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => field.removeAttribute('data-invalid'), 3600)
              }
              el.focus()
            }
          }, 100)
          return
        }
      } else if (ownerMode === 'edit') {
        if (!newOwnerName.trim()) {
          toast.error('Please fill in the Owner Full Name.')
          setTimeout(() => {
            const el = document.getElementById('new-owner-name') as HTMLElement
            if (el) {
              const field = el.closest('[role="group"]') || el.parentElement
              if (field) {
                field.setAttribute('data-invalid', 'true')
                field.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => field.removeAttribute('data-invalid'), 3600)
              }
              el.focus()
            }
          }, 100)
          return
        }
      } else {
        if (!selectedOwnerId) {
          toast.error('Please select an owner for this PG listing.')
          setTimeout(() => {
            const el = document.querySelector('[role="combobox"]') as HTMLElement
            if (el) {
              const field = el.closest('[role="group"]') || el.parentElement
              if (field) {
                field.setAttribute('data-invalid', 'true')
                field.scrollIntoView({ behavior: 'smooth', block: 'center' })
                setTimeout(() => field.removeAttribute('data-invalid'), 3600)
              }
              el.focus()
            }
          }, 100)
          return
        }
      }
    }

    saveMutation.mutate(data)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(window.location.pathname.startsWith('/admin') ? '/admin/pgs' : '/owner/pgs')} className="mb-4 -ml-2">
        <ArrowLeft className="size-4" /> Back to Listings
      </Button>

      <h1 className="scroll-m-20 text-2xl font-bold tracking-tight mb-2">
        {isNew ? 'Add New PG' : 'Edit PG Listing'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {isNew ? 'Fill in the details below to submit your PG for admin approval.' : 'Update your PG listing details.'}
      </p>

      <form onSubmit={form.handleSubmit(onValidSubmit, onInvalidSubmit)} className="space-y-6">
        {/* Owner Assignment (Admin Only) */}
        {isAdmin && (
          <Card className="border-indigo-500/30 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-5 text-indigo-500" />
                Owner Assignment
              </CardTitle>
              <CardDescription>Assign this PG listing to a property owner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNew && (
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={ownerMode === 'select' || ownerMode === 'edit' ? 'default' : 'outline'}
                    onClick={() => setOwnerMode('select')}
                    className="flex-1"
                  >
                    Select Existing Owner
                  </Button>
                  <Button
                    type="button"
                    variant={ownerMode === 'create' ? 'default' : 'outline'}
                    onClick={() => {
                      setOwnerMode('create')
                      setNewOwnerName('')
                      setNewOwnerPhone('')
                      setNewOwnerPhoneAlternate('')
                      setNewOwnerEmail('')
                      setNewOwnerPassword('')
                    }}
                    className="flex-1"
                  >
                    Create New Owner Inline
                  </Button>
                </div>
              )}

              {ownerMode === 'select' ? (
                <div className="space-y-4">
                  {/* City and Locality filters */}
                  <div className="grid grid-cols-2 gap-4 border p-3 rounded-md bg-muted/10">
                    <Field>
                      <FieldLabel htmlFor="filter-city">Filter by City</FieldLabel>
                      <Select value={filterCity || 'all-cities'} onValueChange={(val) => {
                        setFilterCity(val)
                        setFilterLocality('')
                      }}>
                        <SelectTrigger id="filter-city">
                          <SelectValue placeholder="All Cities" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="all-cities">All Cities</SelectItem>
                          {uniqueCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="filter-locality">Filter by Area</FieldLabel>
                      <Select
                        value={filterLocality || 'all-localities'}
                        onValueChange={setFilterLocality}
                        disabled={!filterCity || filterCity === 'all-cities'}
                      >
                        <SelectTrigger id="filter-locality">
                          <SelectValue placeholder="All Areas" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="all-localities">All Areas</SelectItem>
                          {uniqueLocalities.map((loc) => (
                            <SelectItem key={loc} value={loc}>
                              {loc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Select Owner *</FieldLabel>
                    <div className="space-y-2">
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-muted/5 space-y-1.5 scrollbar-thin">
                        {filteredOwners.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">No owners found matching these filters.</div>
                        ) : (
                          filteredOwners.map((o: any) => {
                            const isSelected = selectedOwnerId === o.id
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => setSelectedOwnerId(o.id)}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-md border text-sm transition-all flex justify-between items-center",
                                  isSelected
                                    ? "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold shadow-xs"
                                    : "bg-card hover:bg-muted/50 border-border text-foreground"
                                )}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{o.full_name}</span>
                                  <span className="text-xs text-muted-foreground">{o.email}</span>
                                </div>
                                {o.phone && <span className="text-xs text-muted-foreground">{o.phone}</span>}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </Field>

                  {selectedOwnerId && (
                    <div className="p-4 rounded-lg border bg-muted/10 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Autofilled Owner Details</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const owner = (owners || []).find((o: any) => o.id === selectedOwnerId)
                            if (owner) {
                              setNewOwnerName(owner.full_name || '')
                              setNewOwnerPhone(owner.phone || '')
                              setNewOwnerEmail(owner.email || '')
                              setOwnerMode('edit')
                            }
                          }}
                          className="shrink-0 h-8"
                        >
                          Edit Selected Owner
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm pt-1">
                        <div>
                          <span className="text-muted-foreground block text-xs">Full Name</span>
                          <span className="font-medium">{newOwnerName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Phone</span>
                          <span className="font-medium">{newOwnerPhone || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Alternate Phone</span>
                          <span className="font-medium">{newOwnerPhoneAlternate || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Email</span>
                          <span className="font-medium">{newOwnerEmail || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm">
                      {ownerMode === 'create' ? 'Create New Owner Details' : 'Edit Owner Details'}
                    </h4>
                    {ownerMode === 'edit' && isNew && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOwnerMode('select')}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Back to Selection
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel htmlFor="new-owner-name">Owner Full Name *</FieldLabel>
                      <Input
                        id="new-owner-name"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-owner-phone">Owner Phone</FieldLabel>
                      <Input
                        id="new-owner-phone"
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                        placeholder="e.g. +919876543210"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="new-owner-phone-alternate">Owner Alternate Phone</FieldLabel>
                      <Input
                        id="new-owner-phone-alternate"
                        value={newOwnerPhoneAlternate}
                        onChange={(e) => setNewOwnerPhoneAlternate(e.target.value)}
                        placeholder="e.g. +919876543211"
                      />
                    </Field>
                  </div>

                  {ownerMode === 'create' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="new-owner-email">Owner Email *</FieldLabel>
                        <Input
                          id="new-owner-email"
                          type="email"
                          value={newOwnerEmail}
                          onChange={(e) => setNewOwnerEmail(e.target.value)}
                          placeholder="e.g. ramesh@example.com"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="new-owner-password">Owner Password *</FieldLabel>
                        <Input
                          id="new-owner-password"
                          type="password"
                          value={newOwnerPassword}
                          onChange={(e) => setNewOwnerPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Essential details about your PG property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">PG Name *</FieldLabel>
                  <Input {...field} id="name" placeholder="Sunrise PG for Boys" aria-invalid={fieldState.invalid} />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea {...field} id="description" placeholder="Tell seekers about your PG, its facilities, and what makes it special..." rows={3} aria-invalid={fieldState.invalid} />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="pg_type"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Gender Preference *</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select gender preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boys">Boys Only</SelectItem>
                      <SelectItem value="girls">Girls Only</SelectItem>
                      <SelectItem value="coliving">Coliving</SelectItem>
                      {field.value === 'co-ed' && (
                        <SelectItem value="co-ed">Co-ed (Legacy)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>Address and locality details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="address"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="address">Full Address *</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input {...field} id="address" placeholder="123, Main Street, Near Metro Station" className="pl-10" aria-invalid={fieldState.invalid} />
                  </div>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  <FieldDescription>Enter the complete address for Google Maps pin location</FieldDescription>
                </Field>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Controller
                name="city"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="city">City *</FieldLabel>
                    <Input {...field} id="city" placeholder="Bangalore" aria-invalid={fieldState.invalid} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="locality"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="locality">Locality / Area *</FieldLabel>
                    <Input {...field} id="locality" placeholder="Koramangala" aria-invalid={fieldState.invalid} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="pincode"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="pincode">Pincode</FieldLabel>
                    <Input {...field} id="pincode" placeholder="560034" aria-invalid={fieldState.invalid} />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-sm">Nearby Attractions & Landmarks</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Controller
                  name="near_malls"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="near_malls">Near Malls</FieldLabel>
                      <Input {...field} id="near_malls" placeholder="e.g. Nexus Mall" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="near_parks"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="near_parks">Near Parks</FieldLabel>
                      <Input {...field} id="near_parks" placeholder="e.g. Cubbon Park" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="near_pubs"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="near_pubs">Famous Pubs</FieldLabel>
                      <Input {...field} id="near_pubs" placeholder="e.g. Toit, Windmills" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="near_transit"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="near_transit">Nearby Transit</FieldLabel>
                      <Input {...field} id="near_transit" placeholder="e.g. Metro Station" aria-invalid={fieldState.invalid} />
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sharing Types Configuration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Sharing Types & Pricing</CardTitle>
              <CardDescription>Configure room sharing options and prices</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSharingType}
              disabled={
                (watchedPgType === 'coliving' || watchedPgType === 'co-ed')
                  ? sharingTypes.length >= 1
                  : sharingTypes.length >= 4
              }
            >
              <Plus className="size-4" /> Add Sharing Type
            </Button>
          </CardHeader>
          <CardContent>
            {sharingTypes.length > 0 ? (
              <div className="space-y-4">
                {sharingTypes.map((st, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Sharing</label>
                        <Select
                          value={String(st.type)}
                          onValueChange={(v) => {
                            const newTypes = [...sharingTypes]
                            newTypes[index].type = Number(v) as 1 | 2 | 3 | 4
                            setSharingTypes(newTypes)
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Single</SelectItem>
                            {watchedPgType !== 'coliving' && watchedPgType !== 'co-ed' && (
                              <>
                                <SelectItem value="2">Double</SelectItem>
                                <SelectItem value="3">Triple</SelectItem>
                                <SelectItem value="4">Dormitory</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Monthly Rent (¥)</label>
                        <Input
                          type="number"
                          value={st.price_monthly}
                          onChange={(e) => {
                            const newTypes = [...sharingTypes]
                            newTypes[index].price_monthly = e.target.value
                            setSharingTypes(newTypes)
                          }}
                          placeholder="8000"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Daily Rent (¥)</label>
                        <Input
                          type="number"
                          value={st.price_daily}
                          onChange={(e) => {
                            const newTypes = [...sharingTypes]
                            newTypes[index].price_daily = e.target.value
                            setSharingTypes(newTypes)
                          }}
                          placeholder="300"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Total Beds</label>
                        <Input
                          type="number"
                          value={st.total_beds}
                          onChange={(e) => {
                            const newTypes = [...sharingTypes]
                            newTypes[index].total_beds = e.target.value
                            setSharingTypes(newTypes)
                          }}
                          placeholder="4"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeSharingType(index)} className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-3">No sharing types configured</p>
                <Button type="button" variant="outline" onClick={addSharingType}>
                  <Plus className="size-4" /> Add First Sharing Type
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amenities</CardTitle>
            <CardDescription>Select the facilities available at your PG</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {AMENITY_KEYS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30">
                  <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                  <Switch
                    id={key}
                    checked={amenities[key]}
                    onCheckedChange={(v) => setAmenities((prev) => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deposit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing & Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="deposit_amount"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="deposit_amount">Security Deposit (¥)</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    id="deposit_amount"
                    type="number"
                    placeholder="10000"
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        {/* House Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">House Rules</CardTitle>
            <CardDescription>Guidelines for residents</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="rules"
              control={form.control}
              render={({ field }) => (
                <Textarea {...field} placeholder="No guests after 10pm, No smoking in rooms, Gate closes at 11pm..." rows={4} />
              )}
            />
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photos</CardTitle>
            <CardDescription>Upload photos to showcase your PG (max 10 photos)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/jpeg,image/png,application/pdf'
                input.multiple = true
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files
                  if (files) handleFileUpload(files)
                }
                input.click()
              }}
            >
              <Upload className="size-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drag & drop photos or PDFs here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG, PDF up to 5MB each</p>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">Uploading... {Math.round(uploadProgress)}%</p>
              </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={photo.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPhotos(photos.filter((_, i) => i !== index))
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    {index === 0 && (
                      <Badge className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground">Primary</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(window.location.pathname.startsWith('/admin') ? '/admin/pgs' : '/owner/pgs')}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isNew ? 'Submit for Approval' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
