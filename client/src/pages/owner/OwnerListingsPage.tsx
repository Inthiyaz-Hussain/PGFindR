import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, BedDouble, Eye, MoreVertical, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { PGListing } from '@/types'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Live', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
  inactive: { label: 'Inactive', class: 'bg-gray-100 text-gray-700 border-gray-200' },
}

export function OwnerListingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: listings, isLoading } = useQuery({
    queryKey: ['owner-all-listings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
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
      const { error } = await supabase.from('pg_listings').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-all-listings'] })
      toast.success('Listing deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete listing'),
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">My Listings</h1>
          <p className="text-muted-foreground mt-1">Manage your PG properties</p>
        </div>
        <Button onClick={() => navigate('/owner/listings/new')}>
          <Plus className="size-4" /> Add PG
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : listings && listings.length > 0 ? (
        <div className="space-y-4">
          {listings.map((l) => {
            const cfg = STATUS_CONFIG[l.status]
            const photo = l.photos?.find((p: { is_primary: boolean }) => p.is_primary) || l.photos?.[0]
            return (
              <Card key={l.id}>
                <CardContent className="pt-4">
                  <div className="flex gap-4">
                    <div className="h-20 w-28 shrink-0 rounded-lg overflow-hidden bg-muted">
                      {photo ? (
                        <img src={(photo as { url: string }).url} alt={l.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <BedDouble className="size-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold">{l.name}</div>
                          <div className="text-sm text-muted-foreground">{l.locality}, {l.city}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-xs ${cfg.class}`}>{cfg.label}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/pg/${l.id}`)}>
                                <Eye className="size-4" /> View Live
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/owner/listings/${l.id}`)}>
                                <Edit className="size-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/owner/listings/${l.id}/beds`)}>
                                <BedDouble className="size-4" /> Manage Beds
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeleteId(l.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{l.available_beds}/{l.total_beds} beds available</span>
                        <span>₹{l.monthly_rent_min.toLocaleString('en-IN')}{l.monthly_rent_max > l.monthly_rent_min ? `–${l.monthly_rent_max.toLocaleString('en-IN')}` : ''}/mo</span>
                        <span className="capitalize">{l.pg_type} PG</span>
                      </div>
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
          <EmptyTitle>No listings yet</EmptyTitle>
          <EmptyDescription>Add your first PG to start receiving inquiries from seekers.</EmptyDescription>
          <Button onClick={() => navigate('/owner/listings/new')}>
            <Plus className="size-4" /> Add Your First PG
          </Button>
        </Empty>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the PG listing and all its beds. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
