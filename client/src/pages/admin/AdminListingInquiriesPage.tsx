import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, Search, ChevronLeft, ChevronRight, CheckCircle, Loader2, Link2, Copy, Check, Eye, User, Phone, Mail, MapPin, Building, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const ITEMS_PER_PAGE = 10

interface PGListing {
  id: string
  name: string
  address: string
  status: string
}

interface PendingOwner {
  id: string
  full_name: string
  phone: string | null
  phone_alternate?: string | null
  email: string | null
  google_verified: boolean
  google_verified_at: string | null
  created_at: string
  pg_listings?: PGListing[] | PGListing | null
}

export function AdminListingInquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const [selectedOwner, setSelectedOwner] = useState<PendingOwner | null>(null)
  const [reviewOwner, setReviewOwner] = useState<PendingOwner | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const page = Number(searchParams.get('page') || '1')
  const searchQuery = searchParams.get('search') || ''

  const { data: inquiriesData, isLoading } = useQuery({
    queryKey: ['admin-listing-inquiries', page, searchQuery],
    queryFn: async () => {
      let query = supabaseUntyped
        .from('profiles')
        .select(`
          *,
          pg_listings(id, name, address, status)
        `)
        .eq('role', 'owner')
        .eq('onboarding_verified', false)
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error

      const list = (data || []) as PendingOwner[]
      const total = list.length

      // Paginate in-memory
      const paginated = list.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

      return { inquiries: paginated, total }
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      if (!session) throw new Error('Not authenticated')

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/auth/admin/verify-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ownerId, verify: true })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to verify owner')
      }

      return resData as { message: string; actionLink: string | null }
    },
    onMutate: async (ownerId) => {
      await queryClient.cancelQueries({ queryKey: ['admin-listing-inquiries'] })
      const queries = queryClient.getQueriesData({ queryKey: ['admin-listing-inquiries'] })
      const previousData = queries.map(([key, data]) => [key, data])
      
      let optimisticOwner: PendingOwner | null = null

      queries.forEach(([queryKey, oldData]: any) => {
        if (!oldData || !oldData.inquiries) return
        if (!optimisticOwner) {
          optimisticOwner = oldData.inquiries.find((i: any) => i.id === ownerId) || null
        }
        queryClient.setQueryData(queryKey, {
          ...oldData,
          inquiries: oldData.inquiries.filter((inq: any) => inq.id !== ownerId)
        })
      })

      if (optimisticOwner) {
        setSelectedOwner(optimisticOwner)
      }
      setReviewOwner(null)

      return { previousData, optimisticOwner }
    },
    onSuccess: (data) => {
      if (data.actionLink) {
        setGeneratedLink(data.actionLink)
      } else {
        toast.success('Owner verified successfully!')
      }
    },
    onError: (err: any, _ownerId, context: any) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, data]: [any, any]) => queryClient.setQueryData(key, data))
      }
      toast.error(err.message || 'Failed to verify owner')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listing-inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
    }
  })

  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success('Password setup link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const totalPages = Math.ceil((inquiriesData?.total || 0) / ITEMS_PER_PAGE)

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    setSearchParams(params)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">New PG Listing Inquiries</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve owner registration requests and initial PG listings
          </p>
        </div>
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800/80">
        <CardHeader className="pb-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base font-semibold">Pending Requests ({inquiriesData?.total || 0})</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : inquiriesData?.inquiries && inquiriesData.inquiries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>PG Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Google Auth</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiriesData.inquiries.map((owner) => {
                    const pg = Array.isArray(owner.pg_listings) 
                      ? owner.pg_listings[0] 
                      : owner.pg_listings

                    return (
                      <TableRow key={owner.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {owner.full_name}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{owner.phone || '—'}</div>
                          <div className="text-xs text-muted-foreground">{owner.email || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {pg?.name || 'Pending Onboarding'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {pg?.address || '—'}
                        </TableCell>
                        <TableCell>
                          {owner.google_verified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
                              Google Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800">
                              Pending Google Auth
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewOwner(owner)}
                            className="border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Eye className="size-3.5 mr-1.5" />
                            Open Inquiry
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="border-none py-12">
              <EmptyMedia variant="icon" className="bg-slate-100 dark:bg-slate-800">
                <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
              </EmptyMedia>
              <EmptyTitle>All clear!</EmptyTitle>
              <EmptyDescription>
                No pending owner PG listing inquiries require verification at this time.
              </EmptyDescription>
            </Empty>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set('page', String(page - 1))
                  setSearchParams(params)
                }}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set('page', String(page + 1))
                  setSearchParams(params)
                }}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Owner Inquiry Review Modal */}
      <Dialog open={!!reviewOwner} onOpenChange={(open) => { if (!open) setReviewOwner(null) }}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              <ClipboardList className="size-5.5 text-indigo-600 dark:text-indigo-400" />
              PG Listing Inquiry Details
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Below are the exact details submitted by the owner in the registration form. Please review carefully before granting dashboard access.
            </DialogDescription>
          </DialogHeader>

          {reviewOwner && (() => {
            const pg = Array.isArray(reviewOwner.pg_listings) 
              ? reviewOwner.pg_listings[0] 
              : reviewOwner.pg_listings

            return (
              <div className="space-y-5 py-2">
                {/* Profile Information Block */}
                <div className="space-y-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Owner Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="size-3" /> Full Name
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{reviewOwner.full_name}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="size-3" /> Email Address
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 select-all">{reviewOwner.email || '—'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3" /> Mobile Number
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{reviewOwner.phone || '—'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3" /> Alternate Mobile
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{reviewOwner.phone_alternate || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Listing Details Block */}
                <div className="space-y-3.5 p-4 rounded-xl bg-indigo-50/20 dark:bg-slate-950 border border-indigo-100/30 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-indigo-600/80 dark:text-indigo-400/80 uppercase tracking-wider">
                    PG Listing Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="size-3" /> Proposed PG Name
                      </span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400 text-base">{pg?.name || 'Pending Onboarding'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" /> Address & Location
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 leading-relaxed block">{pg?.address || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Identity Verification Alert */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-100 bg-yellow-50/30 dark:border-yellow-950/20 dark:bg-yellow-950/10 text-xs">
                  <ShieldAlert className="size-4.5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                  <div className="text-slate-600 dark:text-slate-400 space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Identity Status: </span>
                    {reviewOwner.google_verified ? (
                      <span>The user has completed verification through Google Auth.</span>
                    ) : (
                      <span>The user has not yet completed Google Authentication. Verification is recommended after Google Auth completes.</span>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" onClick={() => setReviewOwner(null)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    onClick={() => verifyMutation.mutate(reviewOwner.id)}
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle className="size-4 mr-1.5" />
                    )}
                    Approve & Send Verification Mail
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Verification Success Link Modal */}
      <Dialog open={!!generatedLink} onOpenChange={(open) => { if (!open) setGeneratedLink(null) }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <Link2 className="size-5 text-green-600 dark:text-green-400" />
              Password Setup Recovery Link
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              The owner profile for <strong className="text-slate-900 dark:text-slate-100">{selectedOwner?.full_name}</strong> has been successfully verified! A simulated password setup email has been dispatched. You may also copy the recovery link manually below:
            </DialogDescription>
          </DialogHeader>

          {generatedLink && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
              <span className="text-xs font-mono select-all truncate flex-1 text-slate-700 dark:text-slate-300">
                {generatedLink}
              </span>
              <Button size="icon-sm" variant="ghost" onClick={handleCopyLink} className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700">
                {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5 text-slate-500" />}
              </Button>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold" onClick={() => setGeneratedLink(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
