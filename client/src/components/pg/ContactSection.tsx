import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, MessageSquare, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { InquiryModal } from '@/components/inquiry/InquiryModal'
import type { SharingTypeItem } from '@/types'

interface ContactSectionProps {
  pgId: string
  pgName: string
  ownerName: string
  ownerPhone: string | null
  selectedSharing: SharingTypeItem | null
  sharingTypes: SharingTypeItem[]
}

export function ContactSection({
  pgId,
  pgName,
  ownerName,
  ownerPhone,
  selectedSharing: _selectedSharing,
  sharingTypes,
}: ContactSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [inquiryOpen, setInquiryOpen] = useState(false)

  const isLoggedIn = !!user

  function handleSuccess(_id: string) {
    navigate('/my-inquiries')
  }

  return (
    <>
      <div className="sticky top-24 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interested in this PG?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="size-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">{ownerName}</div>
                <div className="text-xs text-muted-foreground">PG Owner</div>
              </div>
            </div>

            {/* Phone number */}
            <div className="relative rounded-lg bg-muted p-4">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-green-600" />
                  <span className="text-sm font-medium">{ownerPhone || 'Not available'}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 blur-sm select-none">
                    <Phone className="size-4" />
                    <span className="text-sm font-medium">+91 9XXXX XXXXX</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium text-center px-2">
                      <Lock className="size-3.5 shrink-0 text-slate-400" />
                      <span>Send inquiry to view contact</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Send Inquiry */}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={() => setInquiryOpen(true)}>
              <MessageSquare className="size-4 mr-1.5" />
              Send Inquiry
            </Button>
          </CardContent>
        </Card>
      </div>

      <InquiryModal
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        pgId={pgId}
        pgName={pgName}
        sharingTypes={sharingTypes}
        onSuccess={handleSuccess}
      />
    </>
  )
}
