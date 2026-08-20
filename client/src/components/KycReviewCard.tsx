import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, CheckCircle, XCircle, Loader2, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'

export interface TenantKycRecord {
  id: string
  tenant_id: string
  document_type: string
  status: 'pending' | 'verified' | 'rejected'
  uploaded_at: string
  tenant?: {
    full_name: string
    email: string
  }
}

interface KycReviewCardProps {
  record: TenantKycRecord
  token: string
  onStatusUpdated: () => void
}

export function KycReviewCard({ record, token, onStatusUpdated }: KycReviewCardProps) {
  const [viewLoading, setViewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<'verify' | 'reject' | null>(null)

  const handleView = async () => {
    setViewLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/kyc/view-url?kycId=${record.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate view URL')
      }

      const data = await response.json()
      if (data.viewUrl) {
        window.open(data.viewUrl, '_blank')
      } else {
        toast.error('No view URL returned')
      }
    } catch (err: any) {
      console.error('Error viewing document:', err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setViewLoading(false)
    }
  }

  const handleUpdateStatus = async (status: 'verified' | 'rejected') => {
    setActionLoading(status === 'verified' ? 'verify' : 'reject')
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/kyc/${record.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to update status')
      }

      toast.success(`Document marked as ${status}`)
      onStatusUpdated()
    } catch (err: any) {
      console.error('Error updating KYC status:', err)
      toast.error(`Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: TenantKycRecord['status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200">Verified</Badge>
      case 'rejected':
        return <Badge className="bg-rose-50 text-rose-700 border border-rose-200">Rejected</Badge>
      default:
        return <Badge className="bg-amber-50 text-amber-800 border border-amber-200">Pending Review</Badge>
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="size-5 text-indigo-650" />
            <span className="capitalize">{record.document_type.replace('_', ' ')}</span>
          </CardTitle>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            <span>
              Submitted on:{' '}
              {new Date(record.uploaded_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <div>{getStatusBadge(record.status)}</div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tenant Information */}
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-slate-850 rounded-lg text-indigo-600">
            <User className="size-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Tenant Details</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {record.tenant?.full_name || 'Unknown User'}
            </div>
            <div className="text-xs text-muted-foreground">{record.tenant?.email}</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 justify-end pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleView}
            disabled={viewLoading}
            className="gap-1.5"
          >
            {viewLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Eye className="size-3.5" />
            )}
            View Scan
          </Button>

          {record.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 hover:text-emerald-950"
                onClick={() => handleUpdateStatus('verified')}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'verify' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="size-3.5 mr-1" />
                )}
                Approve
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-rose-50 hover:bg-rose-100 text-rose-805 border-rose-200"
                onClick={() => handleUpdateStatus('rejected')}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'reject' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5 mr-1" />
                )}
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
