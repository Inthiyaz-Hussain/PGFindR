import { useState } from 'react'
import { FileCheck, Loader2, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { OwnerKYC } from '@/types'
import { toast } from 'sonner'

const KYC_STATUS_CONFIG = {
  pending: { label: 'Under Review', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
}

export function KYCPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ pan_number: '', aadhaar_number: '', bank_account: '', bank_ifsc: '', bank_name: '' })

  const { data: kyc, isLoading } = useQuery({
    queryKey: ['kyc', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('owner_kyc').select('*').eq('owner_id', user!.id).single()
      if (data) {
        const k = data as OwnerKYC
        setForm({
          pan_number: k.pan_number || '',
          aadhaar_number: k.aadhaar_number || '',
          bank_account: k.bank_account || '',
          bank_ifsc: k.bank_ifsc || '',
          bank_name: k.bank_name || '',
        })
      }
      return data as OwnerKYC | null
    },
    enabled: !!user,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (kyc) {
        const { error } = await (supabase.from('owner_kyc') as any).update({ ...form, updated_at: new Date().toISOString() }).eq('owner_id', user!.id)
        if (error) throw error
      } else {
        const { error } = await (supabase.from('owner_kyc') as any).insert({ ...form, owner_id: user!.id })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', user?.id] })
      toast.success('KYC details submitted for review!')
    },
    onError: () => toast.error('Failed to save KYC details'),
  })

  const cfg = kyc ? KYC_STATUS_CONFIG[kyc.status] : null

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">KYC Verification</h1>
        <p className="text-muted-foreground mt-1">Complete verification to go live on PGFindR</p>
      </div>

      {!isLoading && kyc?.status === 'approved' && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="size-5 text-green-600 shrink-0" />
          <div>
            <div className="font-medium text-green-800">KYC Approved</div>
            <div className="text-sm text-green-700">Your identity has been verified. You can now list PGs.</div>
          </div>
        </div>
      )}

      {!isLoading && kyc && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">KYC Status:</span>
          <Badge variant="outline" className={cfg?.class}>{cfg?.label}</Badge>
        </div>
      )}

      {kyc?.admin_notes && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Admin notes: {kyc.admin_notes}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileCheck className="size-5" /> KYC Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>PAN Number</Label>
              <Input value={form.pan_number} onChange={(e) => setForm((p) => ({ ...p, pan_number: e.target.value.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>Aadhaar Number (last 4 digits)</Label>
              <Input value={form.aadhaar_number} onChange={(e) => setForm((p) => ({ ...p, aadhaar_number: e.target.value }))} placeholder="XXXX-XXXX-4567" />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Account Number</Label>
              <Input value={form.bank_account} onChange={(e) => setForm((p) => ({ ...p, bank_account: e.target.value }))} placeholder="1234567890" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input value={form.bank_ifsc} onChange={(e) => setForm((p) => ({ ...p, bank_ifsc: e.target.value.toUpperCase() }))} placeholder="HDFC0001234" />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="HDFC Bank" />
              </div>
            </div>
            <Button type="submit" disabled={saveMutation.isPending || kyc?.status === 'approved'} className="w-full">
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {kyc ? 'Update KYC' : 'Submit for Review'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
