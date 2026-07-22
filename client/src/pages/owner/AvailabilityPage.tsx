import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Users, BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseUntyped } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SharingTypeItem, PGListing } from '@/types'

type BedStatus = 'available' | 'occupied'

const STATUS_CONFIG: Record<BedStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  available: { label: 'Available', icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/40 hover:bg-green-200 dark:hover:bg-green-900/40' },
  occupied: { label: 'Occupied', icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/40' },
}

const SHARING_LABELS: Record<number, string> = {
  1: 'Single Sharing',
  2: 'Double Sharing',
  3: 'Triple Sharing',
  4: 'Dormitory',
}

export function AvailabilityPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('')

  const { data: pg, isLoading: loadingPG } = useQuery({
    queryKey: ['pg-detail', id],
    queryFn: async () => {
      const { data } = await supabaseUntyped.from('pg_listings').select('id, name, city, total_beds, available_beds').eq('id', id!).single()
      return data as PGListing | null
    },
    enabled: !!id,
  })

  const { data: sharingTypes, isLoading: loadingSharing } = useQuery({
    queryKey: ['sharing-types', id],
    queryFn: async () => {
      const { data } = await supabaseUntyped.from('sharing_types').select('*').eq('pg_id', id!).order('type')
      return (data || []) as SharingTypeItem[]
    },
    enabled: !!id,
  })

  // Set first tab as active when data loads
  useEffect(() => {
    if (sharingTypes && sharingTypes.length > 0 && !activeTab) {
      setActiveTab(String(sharingTypes[0].type))
    }
  }, [sharingTypes, activeTab])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`sharing-types-${id}:${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sharing_types', filter: `pg_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['sharing-types', id] })
        queryClient.invalidateQueries({ queryKey: ['pg-detail', id] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, queryClient])

  const updateMutation = useMutation({
    mutationFn: async ({ sharingId, newOccupied }: { sharingId: string; newOccupied: number }) => {
      const sharing = sharingTypes?.find((s) => s.id === sharingId)
      if (!sharing) throw new Error('Sharing type not found')
      const { error } = await supabaseUntyped.from('sharing_types').update({ occupied_beds: newOccupied, updated_at: new Date().toISOString() }).eq('id', sharingId)
      if (error) throw error
      // Also update pg_listings available_beds
      if (pg) {
        const { data: allSharing } = await supabaseUntyped.from('sharing_types').select('total_beds, occupied_beds').eq('pg_id', pg.id)
        const totalBeds = allSharing?.reduce((sum: number, s: { total_beds: number }) => sum + s.total_beds, 0) || 0
        const occupiedBeds = allSharing?.reduce((sum: number, s: { occupied_beds: number }) => sum + s.occupied_beds, 0) || 0
        await supabaseUntyped.from('pg_listings').update({ total_beds: totalBeds, available_beds: totalBeds - occupiedBeds }).eq('id', pg.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharing-types', id] })
      toast.success('Availability updated')
    },
    onError: () => toast.error('Failed to update availability'),
  })

  const cycleBedStatus = (sharingId: string, bedIndex: number) => {
    const sharing = sharingTypes?.find((s) => s.id === sharingId)
    if (!sharing) return

    const occupied = sharing.occupied_beds || 0
    const total = sharing.total_beds

    // Bed index < occupied means it's occupied
    const isCurrentlyOccupied = bedIndex < occupied
    let newOccupied: number

    if (isCurrentlyOccupied) {
      // Set this bed to available (decrease occupied)
      newOccupied = occupied - 1
    } else {
      // Set this bed to occupied (increase occupied)
      newOccupied = Math.min(total, occupied + 1)
    }

    updateMutation.mutate({ sharingId, newOccupied })
  }

  if (loadingPG || loadingSharing) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="aspect-square" />)}</div>
      </div>
    )
  }

  if (!pg) {
    return (
      <div className="p-4 md:p-6 max-w-5xl">
        <p className="text-muted-foreground">PG not found</p>
        <Button variant="outline" onClick={() => navigate('/owner/pgs')} className="mt-4">
          <ArrowLeft className="size-4" /> Back to Listings
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/owner/pgs')} className="mb-4 -ml-2">
        <ArrowLeft className="size-4" /> Back to Listings
      </Button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Bed Management</h1>
        <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ['sharing-types', id] }) }}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">{pg.name} - {pg.city}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <BedDouble className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pg.total_beds}</div>
                <div className="text-xs text-muted-foreground">Total Beds</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/30">
                <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{pg.available_beds}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                <XCircle className="size-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{pg.total_beds - pg.available_beds}</div>
                <div className="text-xs text-muted-foreground">Occupied</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sharing Types Tabs */}
      {sharingTypes && sharingTypes.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            {sharingTypes.map((st) => (
              <TabsTrigger key={st.type} value={String(st.type)} className="gap-2">
                <Users className="size-4" />
                {SHARING_LABELS[st.type]}
                <Badge variant="secondary" className="ml-1">
                  {st.total_beds - (st.occupied_beds || 0)}/{st.total_beds}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {sharingTypes.map((st) => (
            <Card key={st.type} className={activeTab === String(st.type) ? 'block' : 'hidden'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{SHARING_LABELS[st.type]}</CardTitle>
                    <CardDescription>
                      ¥{st.price_monthly.toLocaleString('en-IN')}/month
                      {st.price_daily && ` · ¥${st.price_daily.toLocaleString('en-IN')}/day`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {st.total_beds - (st.occupied_beds || 0)} available
                    </Badge>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      {st.occupied_beds || 0} occupied
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline" className="gap-1"><CheckCircle className="size-3 text-green-600" /> Available</Badge>
                  <Badge variant="outline" className="gap-1"><XCircle className="size-3 text-red-600" /> Occupied</Badge>
                  <p className="text-xs text-muted-foreground ml-2">Click a bed to toggle status</p>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {Array.from({ length: st.total_beds }, (_, i) => {
                    const bedIndex = i
                    const isOccupied = bedIndex < (st.occupied_beds || 0)
                    const status: BedStatus = isOccupied ? 'occupied' : 'available'
                    const cfg = STATUS_CONFIG[status]
                    const Icon = cfg.icon

                    return (
                      <button
                        key={i}
                        onClick={() => cycleBedStatus(st.id, bedIndex)}
                        disabled={updateMutation.isPending}
                        className={cn(
                          'aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all',
                          cfg.bg,
                          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                        )}
                      >
                        <Icon className={cn('size-5', cfg.color)} />
                        <span className={cn('text-xs font-medium', cfg.color)}>Bed {i + 1}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </Tabs>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BedDouble className="size-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-medium mb-2">No sharing types configured</p>
            <p className="text-sm text-muted-foreground mb-4">Add sharing types in the PG listing form to manage bed availability.</p>
            <Button variant="outline" onClick={() => navigate(`/owner/pgs/${id}/edit`)}>
              Edit Listing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
