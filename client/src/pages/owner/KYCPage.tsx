import { useState, useEffect } from 'react'
import {
  Loader2,
  Save,
  CheckCircle2,
  Upload,
  CreditCard,
  User,
  Building,
  AlertCircle,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const KYC_STATUS_CONFIG = {
  pending: { label: 'KYC Pending Setup', class: 'bg-slate-100 text-slate-800 border-slate-200' },
  submitted: { label: 'KYC Under Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'KYC Verified', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'KYC Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
  resubmission_requested: { label: 'Resubmission Requested', class: 'bg-orange-100 text-orange-850 border-orange-250 animate-pulse' },
}

export function KYCPage() {
  const { user, profile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()


  // Form states
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [bankHolderName, setBankHolderName] = useState('')
  const [aadhaarNumber, setAadhaarNumber] = useState('')

  // File proof states
  const [files, setFiles] = useState<{
    id_proof: { name: string; url: string; progress: number } | null
    address_proof: { name: string; url: string; progress: number } | null
    ownership_proof: { name: string; url: string; progress: number } | null
  }>({
    id_proof: null,
    address_proof: null,
    ownership_proof: null,
  })

  // Prefill bank data on load from profile
  useEffect(() => {
    if (profile) {
      setBankAccountNumber(profile.bank_account_number || '')
      setBankIfsc(profile.bank_ifsc || '')
      setBankHolderName(profile.bank_holder_name || '')
      // Fetch documents to prefill files
      async function loadDocs() {
        const { data: docs } = await supabase
          .from('owner_documents')
          .select('*')
          .eq('owner_id', user!.id)
        
        if (docs) {
          const updatedFiles = { ...files }
          docs.forEach((doc: any) => {
            const type = doc.doc_type as 'id_proof' | 'address_proof' | 'ownership_proof'
            if (updatedFiles[type] === null) {
              updatedFiles[type] = {
                name: doc.url.split('/').pop() || `${type}.pdf`,
                url: doc.url,
                progress: 100
              }
            }
          })
          setFiles(updatedFiles)
        }
      }
      loadDocs()
    }
  }, [profile, user])

  // Mock File Upload Simulator with Base64 conversion
  const simulateUpload = (type: 'id_proof' | 'address_proof' | 'ownership_proof', file: File) => {
    const fileName = file.name
    setFiles((prev) => ({
      ...prev,
      [type]: { name: fileName, url: '', progress: 10 }
    }))

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      let currentProgress = 10
      const interval = setInterval(() => {
        currentProgress += 30
        if (currentProgress >= 100) {
          currentProgress = 100
          clearInterval(interval)
          toast.success(`${fileName} uploaded successfully!`)
        }
        setFiles((prev) => ({
          ...prev,
          [type]: prev[type] ? { ...prev[type]!, progress: currentProgress, url: dataUrl } : null
        }))
      }, 200)
    }
    reader.readAsDataURL(file)
  }

  // Submit KYC mutation
  const submitKycMutation = useMutation({
    mutationFn: async () => {
      // Validate documents are uploaded
      if (!files.id_proof?.url || !files.address_proof?.url || !files.ownership_proof?.url) {
        throw new Error('Please upload all three required document proofs.')
      }

      const docsPayload = [
        { doc_type: 'id_proof', url: files.id_proof.url },
        { doc_type: 'address_proof', url: files.address_proof.url },
        { doc_type: 'ownership_proof', url: files.ownership_proof.url }
      ]

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/owner/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          bankAccountNumber,
          bankIfsc,
          bankHolderName,
          aadhaarNumber,
          documents: docsPayload
        })
      })

      const resData = await response.json()
      if (!response.ok) {
        throw new Error(resData.error || 'KYC submission failed')
      }
      return resData
    },
    onSuccess: async () => {
      await refreshProfile()
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('KYC documents submitted for review! Admin notified.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit KYC details')
    }
  })

  const requestEditMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: 'edit_requested' } as Record<string, string>)
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await refreshProfile()
      toast.success('Edit request sent to admin. You will be notified once approved.')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to request edit')
    }
  })

  const currentStatus = profile?.kyc_status || 'pending'
  const cfg = KYC_STATUS_CONFIG[currentStatus as keyof typeof KYC_STATUS_CONFIG] || KYC_STATUS_CONFIG.pending

  const kycSubmittedAt = profile?.kyc_submitted_at ? new Date(profile.kyc_submitted_at).getTime() : 0
  const isPast24Hours = kycSubmittedAt > 0 && (Date.now() - kycSubmittedAt) > 24 * 60 * 60 * 1000

  // The user can edit if it's pending, resubmission requested, or within 24 hours of submission.
  const isLocked = currentStatus === 'approved' || 
                   currentStatus === 'edit_requested' || 
                   (currentStatus === 'submitted' && isPast24Hours)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">KYC Verification</h1>
        <p className="text-muted-foreground mt-1">Submit identity, address, property proofs and link your bank details to go live.</p>
      </div>

      {/* KYC Status Callouts */}
      {currentStatus === 'approved' && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/50 p-4 text-green-800 dark:text-green-300">
          <CheckCircle2 className="size-5 text-green-600 shrink-0" />
          <div>
            <div className="font-semibold">KYC Fully Verified & Active</div>
            <div className="text-sm opacity-90">Your property listings are now live and visible to seekers. All dashboard features are unlocked.</div>
          </div>
        </div>
      )}

      {currentStatus === 'submitted' && (
        <div className="flex gap-3 rounded-xl border border-yellow-250 bg-yellow-50/30 p-4 text-yellow-800 dark:text-yellow-400">
          <Loader2 className="size-5 text-yellow-600 shrink-0 animate-spin" />
          <div>
            <div className="font-semibold">KYC Submitted. Under review — usually within 48 hours.</div>
            <div className="text-sm opacity-90">Our admin team is currently reviewing your document proofs. We will notify you via email shortly.</div>
          </div>
        </div>
      )}

      {currentStatus === 'resubmission_requested' && (
        <div className="flex gap-3 rounded-xl border border-orange-250 bg-orange-50/30 p-4 text-orange-850 dark:text-orange-400">
          <AlertCircle className="size-5 text-orange-600 shrink-0" />
          <div>
            <div className="font-semibold">Resubmission Required</div>
            <div className="text-sm font-medium mt-0.5">Admin notes: <span className="italic">{profile?.kyc_notes || 'Please resubmit incorrect files.'}</span></div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant="outline" className={`font-semibold border-0 ${cfg.class}`}>
            {currentStatus === 'edit_requested' ? 'Edit Requested' : cfg.label}
          </Badge>
        </div>
        
        {isLocked && currentStatus !== 'approved' && currentStatus !== 'edit_requested' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => requestEditMutation.mutate()}
            disabled={requestEditMutation.isPending}
            className="text-xs"
          >
            {requestEditMutation.isPending ? <Loader2 className="size-3 mr-2 animate-spin" /> : null}
            Request to Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Step 1: Upload Documents */}
        <Card className={isLocked ? 'opacity-80' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="size-5 text-indigo-650" /> 1. Upload Document Proofs</CardTitle>
            <CardDescription>Upload clear scans or photos (max 5MB, PDF/JPG/PNG).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Identity Proof */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Identity Proof</span>
                  <span className="text-xs text-muted-foreground block">Aadhaar Card OR PAN Card</span>
                </div>
                {!isLocked && (
                  <label className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all">
                    <Upload className="size-3.5" /> Select File
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && simulateUpload('id_proof', e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              {files.id_proof && (
                <div className="text-xs flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between font-semibold">
                    <span className="truncate">{files.id_proof.name}</span>
                    <span>{files.id_proof.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-200" style={{ width: `${files.id_proof.progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Address Proof */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Address Proof</span>
                  <span className="text-xs text-muted-foreground block">Utility Bill, Voter ID, or Aadhaar showing current address</span>
                </div>
                {!isLocked && (
                  <label className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all">
                    <Upload className="size-3.5" /> Select File
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && simulateUpload('address_proof', e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              {files.address_proof && (
                <div className="text-xs flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between font-semibold">
                    <span className="truncate">{files.address_proof.name}</span>
                    <span>{files.address_proof.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-200" style={{ width: `${files.address_proof.progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Property Proof */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-muted/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Property Proof</span>
                  <span className="text-xs text-muted-foreground block">Ownership certificate OR rental agreement for PG premises</span>
                </div>
                {!isLocked && (
                  <label className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 font-semibold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all">
                    <Upload className="size-3.5" /> Select File
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && simulateUpload('ownership_proof', e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              {files.ownership_proof && (
                <div className="text-xs flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between font-semibold">
                    <span className="truncate">{files.ownership_proof.name}</span>
                    <span>{files.ownership_proof.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-200" style={{ width: `${files.ownership_proof.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Bank details */}
        <Card className={isLocked ? 'opacity-80' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="size-5 text-indigo-650" /> 2. Bank Payout details</CardTitle>
            <CardDescription>Enter details where you wish to receive payouts (disbursements calculated minus commission).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); submitKycMutation.mutate() }} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bankHolderName">Account Holder Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bankHolderName"
                    value={bankHolderName}
                    onChange={(e) => setBankHolderName(e.target.value)}
                    disabled={isLocked}
                    placeholder="Suresh Patel"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bankAccountNumber"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    disabled={isLocked}
                    placeholder="123456789012"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bankIfsc">IFSC Code</Label>
                  <Input
                    id="bankIfsc"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    disabled={isLocked}
                    placeholder="HDFC0001234"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aadhaarNumber">Aadhaar Number (Optional)</Label>
                  <Input
                    id="aadhaarNumber"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    disabled={isLocked}
                    placeholder="Last 4 digits only"
                    maxLength={4}
                  />
                </div>
              </div>

              {!isLocked && (
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6" disabled={submitKycMutation.isPending}>
                  {submitKycMutation.isPending ? <Loader2 className="size-5 animate-spin mr-2" /> : <Save className="size-5 mr-2" />}
                  Submit for Verification
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
