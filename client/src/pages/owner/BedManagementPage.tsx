import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Loader2, BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Bed, BedStatus, SharingType } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<BedStatus, { label: string; class: string }> = {
  available: { label: 'Available', class: 'bg-green-100 text-green-800 border-green-200' },
  occupied: { label: 'Occupied', class: 'bg-red-100 text-red-800 border-red-200' },
  reserved: { label: 'Reserved', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  maintenance: { label: 'Maintenance', class: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export function BedManagementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newBed, setNewBed] = useState({
    room_number: '', bed_label: 'Bed 1', sharing_type: 'single' as SharingType,
    monthly_rent: '', floor_number: '1', has_ac: false, has_attached_bath: false,
  })

  const { data: pg } = useQuery({
    queryKey: ['pg-basic', id],
    queryFn: async () => {
      const { data } = await supabase.from('pg_listings').select('name, city').eq('id', id!).single()
      return data
    },
    enabled: !!id,
  })

  const { data: beds, isLoading } = useQuery({
    queryKey: ['beds', id],
    queryFn: async () => {
      const { data } = await supabase.from('beds').select('*').eq('pg_id', id!).order('room_number').order('bed_label')
      return (data || []) as Bed[]
    },
    enabled: !!id,
  })

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`beds-${id}:${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beds', filter: `pg_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['beds', id] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, queryClient])

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from('beds') as any).insert({
        pg_id: id!,
        room_number: newBed.room_number,
        bed_label: newBed.bed_label,
        sharing_type: newBed.sharing_type,
        monthly_rent: Number(newBed.monthly_rent) || 0,
        floor_number: Number(newBed.floor_number) || 1,
        has_ac: newBed.has_ac,
        has_attached_bath: newBed.has_attached_bath,
        status: 'available',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', id] })
      toast.success('Bed added!')
      setShowAdd(false)
      setNewBed({ room_number: '', bed_label: 'Bed 1', sharing_type: 'single', monthly_rent: '', floor_number: '1', has_ac: false, has_attached_bath: false })
    },
    onError: () => toast.error('Failed to add bed'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bedId, status }: { bedId: string; status: BedStatus }) => {
      const { error } = await (supabase.from('beds') as any).update({ status, updated_at: new Date().toISOString() }).eq('id', bedId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', id] })
      toast.success('Bed status updated!')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (bedId: string) => {
      const { error } = await supabase.from('beds').delete().eq('id', bedId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds', id] })
      toast.success('Bed removed')
    },
  })

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/owner/listings')} className="mb-4 -ml-2">
        <ArrowLeft className="size-4" /> Back to Listings
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Manage Beds</h1>
          {pg && <p className="text-muted-foreground mt-1">{(pg as { name: string }).name}</p>}
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? 'secondary' : 'default'}>
          <Plus className="size-4" /> Add Bed
        </Button>
      </div>

      {/* Add Bed Form */}
      {showAdd && (
        <Card className="mb-6 border-primary/30 bg-primary/2">
          <CardContent className="pt-5 space-y-4">
            <h3 className="font-medium text-sm">New Bed</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Room Number *</Label>
                <Input value={newBed.room_number} onChange={(e) => setNewBed((p) => ({ ...p, room_number: e.target.value }))} placeholder="101" />
              </div>
              <div className="space-y-1.5">
                <Label>Bed Label *</Label>
                <Input value={newBed.bed_label} onChange={(e) => setNewBed((p) => ({ ...p, bed_label: e.target.value }))} placeholder="Bed A" />
              </div>
              <div className="space-y-1.5">
                <Label>Sharing Type</Label>
                <Select value={newBed.sharing_type} onValueChange={(v) => setNewBed((p) => ({ ...p, sharing_type: v as SharingType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                    <SelectItem value="triple">Triple</SelectItem>
                    <SelectItem value="dormitory">Dormitory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Rent (₹)</Label>
                <Input type="number" value={newBed.monthly_rent} onChange={(e) => setNewBed((p) => ({ ...p, monthly_rent: e.target.value }))} placeholder="8000" />
              </div>
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input type="number" value={newBed.floor_number} onChange={(e) => setNewBed((p) => ({ ...p, floor_number: e.target.value }))} placeholder="1" />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={newBed.has_ac} onCheckedChange={(v) => setNewBed((p) => ({ ...p, has_ac: v }))} id="new-ac" />
                <Label htmlFor="new-ac" className="font-normal cursor-pointer">AC</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newBed.has_attached_bath} onCheckedChange={(v) => setNewBed((p) => ({ ...p, has_attached_bath: v }))} id="new-bath" />
                <Label htmlFor="new-bath" className="font-normal cursor-pointer">Attached Bathroom</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => addMutation.mutate()} disabled={!newBed.room_number || addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Add Bed
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beds List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading beds...</div>
      ) : beds && beds.length > 0 ? (
        <div className="space-y-3">
          {beds.map((bed) => {
            const cfg = STATUS_CONFIG[bed.status]
            return (
              <Card key={bed.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', {
                      'bg-green-100': bed.status === 'available',
                      'bg-red-100': bed.status === 'occupied',
                      'bg-yellow-100': bed.status === 'reserved',
                      'bg-gray-100': bed.status === 'maintenance',
                    })}>
                      <BedDouble className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">Room {bed.room_number} · {bed.bed_label}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {bed.sharing_type} sharing · Floor {bed.floor_number}
                            {bed.has_ac && ' · AC'}
                            {bed.has_attached_bath && ' · Attached Bath'}
                          </div>
                          <div className="text-sm font-semibold mt-1">₹{bed.monthly_rent.toLocaleString('en-IN')}/mo</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Select value={bed.status} onValueChange={(v) => updateStatusMutation.mutate({ bedId: bed.id, status: v as BedStatus })}>
                            <SelectTrigger className={cn('h-7 text-xs border', cfg.class)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="occupied">Occupied</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteMutation.mutate(bed.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BedDouble className="size-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium">No beds added yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add beds to your PG so seekers can see availability</p>
          <Button onClick={() => setShowAdd(true)}><Plus className="size-4" /> Add First Bed</Button>
        </div>
      )}
    </div>
  )
}
