import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, BedDouble, Eye, MoreVertical, Trash2, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { PGListing } from '@/types'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
  approved: { label: 'Live', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  inactive: { label: 'Inactive', class: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
}

const PG_TYPE_LABELS: Record<string, string> = {
  boys: 'Boys',
  girls: 'Girls',
  'co-ed': 'Co-ed',
}

export function PGListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: listings, isLoading } = useQuery({
    queryKey: ['owner-pgs', user?.id],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('pg_listings')
        .select('*, photos:pg_photos(url, is_primary)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
      return (data || []) as PGListing[]
    },
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseUntyped.from('pg_listings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-pgs'] })
      queryClient.invalidateQueries({ queryKey: ['owner-listings'] })
      toast.success('Listing deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete listing'),
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">My PGs</h1>
          <p className="text-muted-foreground mt-1">Manage your PG properties</p>
        </div>
        <Button onClick={() => navigate('/owner/pgs/new')}>
          <Plus className="size-4" /> Add New PG
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : listings && listings.length > 0 ? (
        <div className="space-y-4">
          {listings.map((l) => {
            const cfg = STATUS_CONFIG[l.status]
            const photo = l.photos?.find((p) => (p as { is_primary: boolean }).is_primary) || l.photos?.[0]
            const photoUrl = photo ? (photo as { url: string }).url : null

            return (
              <Card key={l.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Photo */}
                    <div className="h-32 sm:h-auto sm:w-40 shrink-0 bg-muted relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt={l.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Building2 className="size-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge className={`absolute top-2 left-2 text-xs ${cfg.class}`}>
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{l.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {PG_TYPE_LABELS[l.pg_type]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="size-3.5" />
                            {l.locality}, {l.city}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/pg/${l.id}`)}>
                              <Eye className="size-4" /> View Live Page
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/owner/pgs/${l.id}/edit`)}>
                              <Edit className="size-4" /> Edit Listing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/owner/pgs/${l.id}/availability`)}>
                              <BedDouble className="size-4" /> Manage Availability
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(l.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="size-4 text-muted-foreground" />
                          <span className="font-medium">{l.available_beds}</span>
                          <span className="text-muted-foreground">/{l.total_beds} beds available</span>
                        </div>
                        <div className="text-muted-foreground">|</div>
                        <div className="font-semibold text-primary">
                          from ¥{l.monthly_rent_min?.toLocaleString('en-IN')}/mo
                          {l.monthly_rent_max > l.monthly_rent_min && ` - ¥${l.monthly_rent_max.toLocaleString('en-IN')}/mo`}
                        </div>
                      </div>

                      {l.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {l.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Empty className="border-dashed">
          <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
          <EmptyTitle>No PGs listed yet</EmptyTitle>
          <EmptyDescription>Add your first PG property to start receiving inquiries from seekers.</EmptyDescription>
          <Button onClick={() => navigate('/owner/pgs/new')}>
            <Plus className="size-4" /> Add Your First PG
          </Button>
        </Empty>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the PG listing, all bed configurations, and associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
