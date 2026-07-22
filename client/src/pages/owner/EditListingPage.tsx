import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save, Plus, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { PGListing, PGType } from '@/types'
import { toast } from 'sonner'

interface FormData {
  name: string
  description: string
  address: string
  city: string
  locality: string
  pg_type: PGType
  monthly_rent_min: string
  monthly_rent_max: string
  deposit_amount: string
  food_included: boolean
  wifi_included: boolean
  ac_rooms: boolean
  parking: boolean
  laundry: boolean
  security_24x7: boolean
  rules: string
}

const DEFAULT_FORM: FormData = {
  name: '', description: '', address: '', city: '', locality: '',
  pg_type: 'co-ed', monthly_rent_min: '', monthly_rent_max: '', deposit_amount: '',
  food_included: false, wifi_included: false, ac_rooms: false,
  parking: false, laundry: false, security_24x7: false, rules: '',
}

export function EditListingPage() {
  const { id } = useParams<{ id?: string }>()
  const isNew = !id || id === 'new'
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [photoUrl, setPhotoUrl] = useState('')
  const [addingPhoto, setAddingPhoto] = useState(false)

  useQuery({
    queryKey: ['edit-listing', id],
    queryFn: async () => {
      const { data } = await supabase.from('pg_listings').select('*').eq('id', id!).single()
      if (data) {
        const l = data as PGListing
        setForm({
          name: l.name, description: l.description || '', address: l.address,
          city: l.city, locality: l.locality, pg_type: l.pg_type,
          monthly_rent_min: String(l.monthly_rent_min), monthly_rent_max: String(l.monthly_rent_max),
          deposit_amount: String(l.deposit_amount), food_included: l.food_included,
          wifi_included: l.wifi_included, ac_rooms: l.ac_rooms, parking: l.parking,
          laundry: l.laundry, security_24x7: l.security_24x7, rules: l.rules || '',
        })
      }
      return data
    },
    enabled: !isNew && !!id,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        owner_id: user!.id,
        monthly_rent_min: Number(data.monthly_rent_min) || 0,
        monthly_rent_max: Number(data.monthly_rent_max) || 0,
        deposit_amount: Number(data.deposit_amount) || 0,
        updated_at: new Date().toISOString(),
      }
      if (isNew) {
        const { data: res, error } = await (supabase.from('pg_listings') as any).insert(payload).select().single()
        if (error) throw error
        return res as PGListing
      } else {
        const { data: res, error } = await (supabase.from('pg_listings') as any).update(payload).eq('id', id!).select().single()
        if (error) throw error
        return res as PGListing
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-listings'] })
      toast.success(isNew ? 'PG created! Pending admin approval.' : 'Listing updated!')
      navigate(`/owner/listings/${(res as PGListing).id}/beds`)
    },
    onError: () => toast.error('Failed to save listing'),
  })

  const addPhotoMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await (supabase.from('pg_photos') as any).insert({ pg_id: id!, url, is_primary: false })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Photo added'); setPhotoUrl(''); setAddingPhoto(false) },
  })

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/owner/listings')} className="mb-4 -ml-2">
        <ArrowLeft className="size-4" /> Back to Listings
      </Button>

      <h1 className="scroll-m-20 text-2xl font-bold tracking-tight mb-6">
        {isNew ? 'Add New PG' : 'Edit PG Listing'}
      </h1>

      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>PG Name *</Label>
              <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Sunrise PG for Boys" required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Tell seekers about your PG..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>PG Type *</Label>
              <Select value={form.pg_type} onValueChange={(v) => setField('pg_type', v as PGType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boys">Boys Only</SelectItem>
                  <SelectItem value="girls">Girls Only</SelectItem>
                  <SelectItem value="co-ed">Co-ed (Boys & Girls)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Address *</Label>
              <Input value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="123, Main Street, Near Metro" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="Bangalore" required />
              </div>
              <div className="space-y-1.5">
                <Label>Locality *</Label>
                <Input value={form.locality} onChange={(e) => setField('locality', e.target.value)} placeholder="Koramangala" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Min Rent (₹/mo)</Label>
                <Input type="number" value={form.monthly_rent_min} onChange={(e) => setField('monthly_rent_min', e.target.value)} placeholder="8000" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Rent (₹/mo)</Label>
                <Input type="number" value={form.monthly_rent_max} onChange={(e) => setField('monthly_rent_max', e.target.value)} placeholder="15000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Security Deposit (₹)</Label>
              <Input type="number" value={form.deposit_amount} onChange={(e) => setField('deposit_amount', e.target.value)} placeholder="15000" />
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader><CardTitle className="text-base">Amenities</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { key: 'wifi_included' as const, label: 'WiFi' },
                { key: 'food_included' as const, label: 'Food Included' },
                { key: 'ac_rooms' as const, label: 'AC Rooms' },
                { key: 'parking' as const, label: 'Parking' },
                { key: 'laundry' as const, label: 'Laundry' },
                { key: 'security_24x7' as const, label: '24/7 Security' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <Label htmlFor={key} className="font-normal cursor-pointer">{label}</Label>
                  <Switch id={key} checked={form[key]} onCheckedChange={(v) => setField(key, v)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card>
          <CardHeader><CardTitle className="text-base">House Rules</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.rules} onChange={(e) => setField('rules', e.target.value)} placeholder="No guests after 10pm, No smoking..." rows={4} />
          </CardContent>
        </Card>

        {/* Photo Management (only for existing) */}
        {!isNew && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Add Photo</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setAddingPhoto(!addingPhoto)}>
                <Plus className="size-4" /> Add
              </Button>
            </CardHeader>
            {addingPhoto && (
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="Paste photo URL..."
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={() => photoUrl && addPhotoMutation.mutate(photoUrl)} disabled={!photoUrl || addPhotoMutation.isPending}>
                    {addPhotoMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Separator />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/owner/listings')}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isNew ? 'Create Listing' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
