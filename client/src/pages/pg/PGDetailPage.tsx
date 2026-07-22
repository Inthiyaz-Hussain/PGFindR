import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { PhotoGallery } from '@/components/pg/PhotoGallery'
import { PGHeader } from '@/components/pg/PGHeader'
import { AmenitiesGrid } from '@/components/pg/AmenitiesGrid'
import { AvailabilitySection } from '@/components/pg/AvailabilitySection'
import { ReviewsList } from '@/components/pg/ReviewsList'
import { ContactSection } from '@/components/pg/ContactSection'
import type { SharingTypeItem } from '@/types'

interface PGDetailData {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  locality: string
  latitude: number | null
  longitude: number | null
  pg_type: string
  monthly_rent_min: number
  monthly_rent_max: number
  deposit_amount: number
  rules: string | null
  avg_rating: number
  review_count: number
  photos: Array<{
    id: string
    url: string
    type: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom' | null
    caption: string | null
    is_primary: boolean
  }>
  amenities: Array<{ key: string; is_available: boolean }>
  sharing_types: SharingTypeItem[]
  owner: { full_name: string; phone: string | null } | null
}

interface ReviewsResponse {
  data: Array<{
    id: string
    user_id: string
    pg_id: string
    rating: 1 | 2 | 3 | 4 | 5
    comment: string | null
    created_at: string
    reviewer: { full_name: string } | null
  }>
  total: number
  limit: number
  offset: number
}

export function PGDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: _user } = useAuth()
  const [selectedSharing, setSelectedSharing] = useState<SharingTypeItem | null>(null)
  const [reviewOffset, setReviewOffset] = useState(0)

  const REVIEW_LIMIT = 10

  const {
    data: pg,
    isLoading: pgLoading,
    error: pgError,
  } = useQuery<PGDetailData>({
    queryKey: ['pg-detail', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pgs/${id}`)
      if (!res.ok) throw new Error('Failed to load PG details')
      return res.json()
    },
    enabled: !!id,
  })

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
  } = useQuery<ReviewsResponse>({
    queryKey: ['pg-reviews', id, reviewOffset],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/pgs/${id}/reviews?limit=${REVIEW_LIMIT}&offset=${reviewOffset}`)
      if (!res.ok) throw new Error('Failed to load reviews')
      return res.json()
    },
    enabled: !!id,
  })

  const allReviews = reviewsData?.data || []
  const totalReviews = reviewsData?.total || 0
  const hasMoreReviews = allReviews.length < totalReviews

  function handleLoadMoreReviews() {
    setReviewOffset((prev) => prev + REVIEW_LIMIT)
  }

  if (pgLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-72 md:h-96 w-full rounded-xl mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (pgError || !pg) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p className="text-lg font-medium mb-2">PG not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="size-4 mr-1" /> Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
        <ChevronLeft className="size-4 mr-1" /> Back
      </Button>

      {/* Photo Gallery */}
      <section className="mb-6">
        <PhotoGallery photos={pg.photos || []} name={pg.name} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <section>
            <PGHeader
              name={pg.name}
              address={pg.address}
              city={pg.city}
              locality={pg.locality}
              latitude={pg.latitude}
              longitude={pg.longitude}
              pg_type={pg.pg_type}
              avg_rating={pg.avg_rating}
              review_count={pg.review_count}
            />
          </section>

          {/* Pricing */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Monthly Rent</div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <IndianRupee className="size-5" />
                  {pg.monthly_rent_min.toLocaleString('en-IN')}
                  {pg.monthly_rent_max > pg.monthly_rent_min && (
                    <span className="text-lg text-muted-foreground">
                      – ₹{pg.monthly_rent_max.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              {pg.deposit_amount > 0 && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Security Deposit</div>
                  <div className="text-2xl font-bold">
                    ₹{pg.deposit_amount.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Description */}
          {pg.description && (
            <section>
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3">About this PG</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{pg.description}</p>
            </section>
          )}

          {/* Amenities */}
          <section>
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3">Amenities</h2>
            <AmenitiesGrid amenities={pg.amenities || []} />
          </section>

          {/* Rules */}
          {pg.rules && (
            <section>
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3">House Rules</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {pg.rules}
              </p>
            </section>
          )}

          {/* Availability */}
          <section>
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3">Availability</h2>
            <AvailabilitySection
              pgId={pg.id}
              initialSharingTypes={pg.sharing_types || []}
              onSelect={setSelectedSharing}
              selectedId={selectedSharing?.id}
            />
          </section>

          {/* Reviews */}
          <section>
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-3">
              Reviews ({pg.review_count})
            </h2>
            <ReviewsList
              reviews={allReviews.map((r) => ({
                ...r,
                updated_at: r.created_at,
                reviewer: r.reviewer || { full_name: 'Anonymous' },
              }))}
              total={totalReviews}
              isLoading={reviewsLoading}
              onLoadMore={handleLoadMoreReviews}
              hasMore={hasMoreReviews}
            />
          </section>
        </div>

        {/* Sidebar — Contact */}
        <div className="lg:col-span-1">
          <ContactSection
            pgId={pg.id}
            pgName={pg.name}
            ownerName={pg.owner?.full_name || 'Owner'}
            ownerPhone={pg.owner?.phone || null}
            selectedSharing={selectedSharing}
            sharingTypes={pg.sharing_types || []}
          />
        </div>
      </div>
    </div>
  )
}
