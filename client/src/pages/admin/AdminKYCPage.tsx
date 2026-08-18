import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, Eye, FileText, ShieldCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface KYCSubmission {
  owner_id: string
  full_name: string
  email: string
  mobile: string
  kyc_submitted_at: string
  document_count: number
  documents: Array<{ id: string; doc_type: string; url: string; verified: boolean }>
  bank: {
    bank_account_number: string
    bank_ifsc: string
    bank_holder_name: string
  }
  pg_name: string
}

export function AdminKYCPage() {
  const queryClient = useQueryClient()
  const [selectedKyc, setSelectedKyc] = useState<KYCSubmission | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ doc_type: string; url: string } | null>(null)
  
  // Resubmission request states
  const [showResubmitDialog, setShowResubmitDialog] = useState(false)
  const [resubmitNotes, setResubmitNotes] = useState('')
  const [resubmitDocs, setResubmitDocs] = useState<Record<string, boolean>>({
    id_proof: false,
    address_proof: false,
    ownership_proof: false
  })

  // Fetch Session from auth hook
  const { session } = useAuth()
  const sessionData = session

  // Fetch KYC queue
  const { data: kycQueue, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-kyc-queue', sessionData?.access_token],
    queryFn: async () => {
      if (!sessionData?.access_token) return []
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/kyc-queue`, {
        headers: {
          'Authorization': `Bearer ${sessionData.access_token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch KYC queue')
      return response.json() as Promise<KYCSubmission[]>
    },
    enabled: !!sessionData?.access_token
  })

  // Approve KYC mutation
  const approveMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/kyc/${ownerId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Failed to approve KYC')
      return resData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('KYC Approved and Owner account activated!')
      setSelectedKyc(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve KYC')
    }
  })

  // Request Resubmission mutation
  const resubmitMutation = useMutation({
    mutationFn: async ({ ownerId, notes, docTypes }: { ownerId: string; notes: string; docTypes: string[] }) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/admin/kyc/${ownerId}/request-resubmit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionData?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes, documentTypes: docTypes })
      })
      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Failed to request resubmission')
      return resData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-queue'] })
      toast.success('Resubmission request sent to owner.')
      setShowResubmitDialog(false)
      setSelectedKyc(null)
      // Reset resubmit states
      setResubmitNotes('')
      setResubmitDocs({ id_proof: false, address_proof: false, ownership_proof: false })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit resubmission request')
    }
  })

  const handleResubmitSubmit = () => {
    if (!selectedKyc) return
    const selectedTypes = Object.entries(resubmitDocs)
      .filter(([_, checked]) => checked)
      .map(([type]) => type)
    
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one document to resubmit.')
      return
    }
    if (!resubmitNotes) {
      toast.error('Please add notes detailing why the documents are rejected.')
      return
    }

    resubmitMutation.mutate({
      ownerId: selectedKyc.owner_id,
      notes: resubmitNotes,
      docTypes: selectedTypes
    })
  }

  const kycList = kycQueue || []

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" /> KYC Reviews Queue
          </h1>
          <p className="text-muted-foreground mt-1">Verify owner identity proofs and bank accounts before allowing listings to go live.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-center justify-between gap-4">
          <div>
            <span className="font-bold">Error loading reviews:</span> {(error as Error).message || 'Failed to fetch queue'}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-white border-red-350 hover:bg-red-50 text-red-850 shrink-0">
            Retry
          </Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions Queue Table/List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pending Reviews ({kycList.length})</CardTitle>
              <CardDescription>Click any row to open the KYC detail inspection panel.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : kycList.length === 0 ? (
                <Empty className="py-12 border-none">
                  <EmptyMedia variant="icon"><CheckCircle className="h-10 w-10 text-green-500" /></EmptyMedia>
                  <EmptyTitle>All Caught Up!</EmptyTitle>
                  <EmptyDescription>There are no pending KYC reviews in the queue.</EmptyDescription>
                </Empty>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  {kycList.map((k) => (
                    <div
                      key={k.owner_id}
                      onClick={() => setSelectedKyc(k)}
                      className={cn(
                        'p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850 transition-colors',
                        selectedKyc?.owner_id === k.owner_id ? 'bg-indigo-50/20 dark:bg-slate-800' : ''
                      )}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{k.full_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>Listing: <span className="font-medium text-slate-700 dark:text-slate-300">{k.pg_name}</span></span>
                          <span>•</span>
                          <span>Submitted: <span className="font-medium">{new Date(k.kyc_submitted_at).toLocaleDateString('en-IN')}</span></span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="text-xs border-0 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {k.document_count} Files Proof
                        </Badge>
                        <Badge variant="outline" className="text-xs border-0 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Reviewing
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Inspection Drawer Panel */}
        <div className="lg:col-span-1">
          {selectedKyc ? (
            <Card className="border-indigo-100 dark:border-indigo-900/30 shadow-lg sticky top-6">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-lg font-bold">{selectedKyc.full_name}</CardTitle>
                <CardDescription>KYC Documents & Payout Bank Verification</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-6 text-sm">
                {/* Contact */}
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Owner Contact</span>
                  <div className="space-y-1">
                    <div className="font-medium">{selectedKyc.email}</div>
                    <div className="text-slate-500">{selectedKyc.mobile}</div>
                  </div>
                </div>

                {/* Bank payout Details */}
                <div className="bg-muted/30 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Linked Bank Account</span>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Holder Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedKyc.bank.bank_holder_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">IFSC Code</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedKyc.bank.bank_ifsc}</span>
                    </div>
                    <div className="col-span-2 border-t pt-2 mt-1">
                      <span className="text-muted-foreground block">Account Number</span>
                      <code className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedKyc.bank.bank_account_number}</code>
                    </div>
                  </div>
                </div>

                {/* Documents Links */}
                <div className="space-y-3">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Document Proofs ({selectedKyc.document_count})</span>
                  <div className="space-y-2">
                    {selectedKyc.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-muted/10">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-indigo-500 shrink-0" />
                          <span className="text-xs font-semibold capitalize">{doc.doc_type.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            onClick={() => setPreviewDoc({ doc_type: doc.doc_type, url: doc.url })}
                            title="Preview File"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Button
                    onClick={() => approveMutation.mutate(selectedKyc.owner_id)}
                    disabled={approveMutation.isPending || resubmitMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-5"
                  >
                    {approveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
                    Approve KYC & Activate Owner
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowResubmitDialog(true)}
                    disabled={resubmitMutation.isPending || approveMutation.isPending}
                    className="w-full text-destructive hover:text-destructive hover:bg-red-50 py-5"
                  >
                    <XCircle className="size-4 mr-2" />
                    Request Resubmission
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center p-6 border-dashed bg-muted/10 sticky top-6">
              <CardContent className="pt-6 space-y-3">
                <ShieldCheck className="h-10 w-10 text-indigo-400 mx-auto animate-pulse" />
                <div className="font-semibold text-sm">No Owner Selected</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a pending owner submission from the queue on the left to verify their KYC.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Resubmission Request Dialog */}
      <Dialog open={showResubmitDialog} onOpenChange={setShowResubmitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Document Resubmission</DialogTitle>
            <DialogDescription>
              Select which document proofs are invalid or unclear, and add review feedback.
            </DialogDescription>
          </DialogHeader>

          {selectedKyc && (
            <div className="space-y-4 pt-2">
              {/* Document selection */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-700 block">Select documents to reject:</span>
                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="doc-id"
                      checked={resubmitDocs.id_proof}
                      onCheckedChange={(checked) => setResubmitDocs((prev) => ({ ...prev, id_proof: !!checked }))}
                    />
                    <label htmlFor="doc-id" className="text-xs font-medium cursor-pointer">Identity Proof (Aadhaar/PAN)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="doc-addr"
                      checked={resubmitDocs.address_proof}
                      onCheckedChange={(checked) => setResubmitDocs((prev) => ({ ...prev, address_proof: !!checked }))}
                    />
                    <label htmlFor="doc-addr" className="text-xs font-medium cursor-pointer">Address Proof (Utility Bill/Voter ID)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="doc-prop"
                      checked={resubmitDocs.ownership_proof}
                      onCheckedChange={(checked) => setResubmitDocs((prev) => ({ ...prev, ownership_proof: !!checked }))}
                    />
                    <label htmlFor="doc-prop" className="text-xs font-medium cursor-pointer">Property Proof (Ownership/Rental doc)</label>
                  </div>
                </div>
              </div>

              {/* Feedback reason notes */}
              <div className="space-y-1.5">
                <Label htmlFor="resubmitNotes">Admin Review Notes</Label>
                <Textarea
                  id="resubmitNotes"
                  placeholder="Explain why the files were rejected (e.g. 'Identity Proof scan is blurry, please upload a high-resolution photo')..."
                  value={resubmitNotes}
                  onChange={(e) => setResubmitNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <Button variant="ghost" onClick={() => setShowResubmitDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleResubmitSubmit}
                  disabled={resubmitMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {resubmitMutation.isPending ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {previewDoc?.doc_type.replace(/_/g, ' ')} Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/5 rounded-lg border min-h-[50vh]">
            {previewDoc?.url.startsWith('data:application/pdf') ? (
              <iframe
                src={previewDoc.url}
                className="w-full h-[70vh] border-0 rounded-lg"
                title="PDF Preview"
              />
            ) : previewDoc?.url.startsWith('data:image') || previewDoc?.url.includes('image') || previewDoc?.url.includes('.jpg') || previewDoc?.url.includes('.png') || previewDoc?.url.includes('.jpeg') ? (
              <img
                src={previewDoc.url}
                alt="Document Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="text-center space-y-3">
                <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                <Button asChild variant="outline">
                  <a href={previewDoc?.url} download={`document_${previewDoc?.doc_type}`}>
                    Download File
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
