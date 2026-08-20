import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { uploadFileToR2 } from '@/utils/directUpload'
import { FileText, Shield, Upload, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface KycUploadModalProps {
  open: boolean
  onClose: () => void
}

interface KycDoc {
  id: string
  document_type: string
  status: 'pending' | 'verified' | 'rejected'
  uploaded_at: string
  r2_storage_key: string
}

export function KycUploadModal({ open, onClose }: KycUploadModalProps) {
  const { user, session } = useAuth()
  const [docs, setDocs] = useState<KycDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [docType, setDocType] = useState('identity_proof')

  const fetchKycDocs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenant_kyc')
        .select('*')
        .eq('tenant_id', user.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocs(data || [])
    } catch (err: any) {
      console.error('Error fetching KYC documents:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (open && user) {
      fetchKycDocs()
    }
  }, [open, user, fetchKycDocs])

  const compressToWebP = (file: File, quality = 0.85): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: 'image/webp',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to create webp blob'))
            }
          },
          'image/webp',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image for compression'))
    })
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !session?.access_token) return

    setUploading(true)
    setProgress(0)

    try {
      let fileToUpload = file

      // Apply client-side WebP compression for image formats
      if (file.type.startsWith('image/')) {
        toast.info('Compressing image to WebP format...')
        fileToUpload = await compressToWebP(file)
      }

      toast.info(`Uploading ${fileToUpload.name} to KYC storage...`)
      
      await uploadFileToR2(fileToUpload, session.access_token, {
        isKyc: true,
        docType: docType,
        onProgress: (percent) => setProgress(Math.round(percent))
      })

      toast.success('KYC Document uploaded and submitted successfully!')
      fetchKycDocs()
    } catch (err: any) {
      console.error('KYC Upload failed:', err)
      toast.error(`KYC Upload failed: ${err.message || err}`)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const deleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      const { error } = await supabase
        .from('tenant_kyc')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Document deleted successfully')
      fetchKycDocs()
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`)
    }
  }

  const getStatusBadge = (status: KycDoc['status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200">Verified</Badge>
      case 'rejected':
        return <Badge className="bg-rose-50 text-rose-755 border border-rose-200">Rejected</Badge>
      default:
        return <Badge className="bg-amber-50 text-amber-800 border border-amber-200">Pending</Badge>
    }
  }

  const getStatusIcon = (status: KycDoc['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
      case 'rejected':
        return <AlertCircle className="size-5 text-rose-500 shrink-0" />
      default:
        return <Clock className="size-5 text-amber-500 shrink-0" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Shield className="size-5 text-indigo-650" /> Tenant KYC Verification
          </DialogTitle>
          <DialogDescription>
            Upload your verification documents to secure your booking and establish trust with PG owners.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Upload New Document Form */}
          <div className="space-y-3 bg-indigo-50/10 p-4 rounded-xl border border-indigo-100/30">
            <div className="text-sm font-semibold">1. Select Document Type</div>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full text-sm bg-white dark:bg-slate-900 border rounded-lg p-2 outline-none"
              disabled={uploading}
            >
              <option value="identity_proof">Identity Proof (Aadhaar / Voter ID / Passport)</option>
              <option value="pan_card">PAN Card</option>
              <option value="employment_proof">Employment Proof (Offer Letter / ID Card)</option>
              <option value="student_proof">Student Proof (College ID / Admission Slip)</option>
            </select>

            <div className="pt-2">
              <input
                type="file"
                id="kyc-file-upload"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button
                asChild
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 cursor-pointer"
                disabled={uploading}
              >
                <label htmlFor="kyc-file-upload">
                  {uploading ? (
                    <Clock className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  {uploading ? `Uploading (${progress}%)` : 'Select & Upload Document'}
                </label>
              </Button>
            </div>

            {uploading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-1" />
              </div>
            )}
          </div>

          {/* Uploaded Documents List */}
          <div className="space-y-3">
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="size-4 text-indigo-650" /> Uploaded Documents ({docs.length})
            </div>

            {loading ? (
              <div className="text-center py-4 text-xs text-muted-foreground">Loading documents...</div>
            ) : docs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                No KYC documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 border rounded-xl flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getStatusIcon(doc.status)}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold capitalize truncate">
                          {doc.document_type.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(doc.uploaded_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      {doc.status !== 'verified' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          onClick={() => deleteDoc(doc.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
