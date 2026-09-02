import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft,
  IndianRupee,
  MapPin,
  Train,
  ShoppingBag,
  Utensils,
  Hospital,
  Bus,
  BedDouble,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
  pincode: string | null
  latitude: number | null
  longitude: number | null
  pg_type: string
  monthly_rent_min: number
  monthly_rent_max: number
  deposit_amount: number
  rules: string | null
  avg_rating: number
  review_count: number
  near_malls: string | null
  near_parks: string | null
  near_pubs: string | null
  near_transit: string | null
  photos: Array<{
    id: string
    url: string
    type: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom' | null
    caption: string | null
    is_primary: boolean
  }>
  amenities: Array<{ key: string; is_available: boolean }>
  sharing_types: SharingTypeItem[]
  owner: { full_name: string; phone: string | null; phone_alternate?: string | null } | null
  custom_nearby_places?: Array<{ label: string }>
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

function getNearbyLandmarks(pg: {
  locality: string
  city: string
  name: string
  near_malls?: string | null
  near_parks?: string | null
  near_pubs?: string | null
  near_transit?: string | null
  custom_nearby_places?: Array<{ label: string }>
}) {
  const landmarks: Array<{ name: string; type: string; distance: string; icon: any }> = []

  if (pg.near_malls) {
    landmarks.push({ name: pg.near_malls, type: 'Shopping Mall', distance: 'Nearby', icon: ShoppingBag })
  }
  if (pg.near_parks) {
    landmarks.push({ name: pg.near_parks, type: 'Park & Nature', distance: 'Nearby', icon: MapPin })
  }
  if (pg.near_pubs) {
    landmarks.push({ name: pg.near_pubs, type: 'Famous Pub / Bar', distance: 'Nearby', icon: Utensils })
  }
  if (pg.near_transit) {
    landmarks.push({ name: pg.near_transit, type: 'Transit Hub', distance: 'Nearby', icon: Train })
  }
  if (pg.custom_nearby_places && pg.custom_nearby_places.length > 0) {
    pg.custom_nearby_places.forEach(place => {
      landmarks.push({ name: place.label, type: 'Nearby Place', distance: 'Nearby', icon: MapPin })
    })
  }

  return landmarks
}

export function PGDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: _user } = useAuth()
  const [selectedSharing, setSelectedSharing] = useState<SharingTypeItem | null>(null)
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [reviewOffset, setReviewOffset] = useState(0)

  function handleSelectSharing(sharing: SharingTypeItem) {
    setSelectedSharing(sharing)
    setInquiryOpen(true)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const REVIEW_LIMIT = 10

  const {
    data: pg,
    isLoading: pgLoading,
    error: pgError,
  } = useQuery<PGDetailData>({
    queryKey: ['pg-detail', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/pgs/${id}`)
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/pgs/${id}/reviews?limit=${REVIEW_LIMIT}&offset=${reviewOffset}`)
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

  const { data: nearbyPgsData, isLoading: nearbyPgsLoading } = useQuery<{ data: any[] }>({
    queryKey: ['nearby-pgs', pg?.city, pg?.locality, id],
    queryFn: async () => {
      if (!pg) return { data: [] }
      let res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/pgs?q=${encodeURIComponent(pg.locality)}&limit=10`)
      if (!res.ok) throw new Error('Failed to load nearby PGs')
      let result = await res.json()
      
      const filtered = (result.data || []).filter((item: any) => item.id !== pg.id)
      if (filtered.length === 0) {
        res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/pgs?q=${encodeURIComponent(pg.city)}&limit=10`)
        if (!res.ok) throw new Error('Failed to load nearby PGs')
        result = await res.json()
      }
      return result
    },
    enabled: !!pg,
  })

  const nearbyPgs = (nearbyPgsData?.data || [])
    .filter((item) => item.id !== pg?.id)
    .slice(0, 4)

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
          <ChevronLeft className="size-4 mr-1" /> Back
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
              is_verified={(pg as any).is_verified}
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
            <AmenitiesGrid amenities={pg.amenities || []} pg={pg as any} />
          </section>

          {/* Location & Connectivity */}
          <section className="space-y-4">
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">Location & Connectivity</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="h-64 w-full">
                <iframe
                  title="PG Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    pg.latitude && pg.longitude
                      ? `${pg.latitude},${pg.longitude}`
                      : `${pg.address}, ${pg.locality}, ${pg.city}`
                  )}&z=15&output=embed`}
                />
              </div>
              <div className="p-4 bg-muted/30">
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">Exact Address</div>
                    <div className="text-sm text-muted-foreground">{pg.address}, {pg.locality}, {pg.city}{pg.pincode ? ` - ${pg.pincode}` : ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nearby Transit & Landmarks */}
            {getNearbyLandmarks(pg).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {getNearbyLandmarks(pg).map((landmark, idx) => {
                  const Icon = landmark.icon
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-md shrink-0",
                          (landmark.icon === Train || landmark.icon === Bus) && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                          landmark.icon === ShoppingBag && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          landmark.icon === Hospital && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                          landmark.icon === Utensils && "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                        )}>
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium leading-none">{landmark.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{landmark.type}</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold bg-muted px-2.5 py-1 rounded-full text-muted-foreground shrink-0">
                        {landmark.distance}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
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
              onSelect={handleSelectSharing}
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
            ownerPhoneAlternate={pg.owner?.phone_alternate || null}
            selectedSharing={selectedSharing}
            sharingTypes={pg.sharing_types || []}
            inquiryOpen={inquiryOpen}
            setInquiryOpen={setInquiryOpen}
          />
        </div>
      </div>

      {/* Similar PGs Section */}
      <section className="mt-12 border-t border-border pt-8 space-y-6">
        <div className="space-y-1">
          <h2 className="scroll-m-20 text-2xl font-bold tracking-tight">Similar PGs Nearby</h2>
          <p className="text-sm text-muted-foreground">Discover other options around {pg.locality || pg.city}</p>
        </div>

        {nearbyPgsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : nearbyPgs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-xl">
            No other PGs found in this locality or city.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {nearbyPgs.map((nearbyPg) => {
              const primaryPhoto = nearbyPg.photos?.find((p: any) => p.is_primary) || nearbyPg.photos?.[0]
              const typeColor = {
                boys: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200/50',
                girls: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200/50',
                'co-ed': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/50',
                coliving: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/50'
              }
              
              return (
                <Link 
                  key={nearbyPg.id} 
                  to={`/pg/${nearbyPg.id}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 overflow-hidden bg-muted">
                    {primaryPhoto ? (
                      <img
                        src={primaryPhoto.url}
                        alt={nearbyPg.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <BedDouble className="size-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge className={cn('border text-[10px] font-medium px-1.5 py-0.5', typeColor[nearbyPg.pg_type as keyof typeof typeColor] || typeColor['coliving'])}>
                        {nearbyPg.pg_type === 'coliving' ? 'Coliving' : nearbyPg.pg_type === 'co-ed' ? 'Co-ed' : nearbyPg.pg_type === 'boys' ? 'Boys' : 'Girls'}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                      {nearbyPg.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="line-clamp-1">{nearbyPg.locality}, {nearbyPg.city}</span>
                    </div>
                    <div className="pt-1.5 flex items-baseline justify-between border-t border-border/50">
                      <div>
                        <span className="text-xs text-muted-foreground">Rent from</span>
                        <div className="text-sm font-bold text-foreground">
                          ₹{nearbyPg.monthly_rent_min.toLocaleString('en-IN')}
                          <span className="text-[10px] text-muted-foreground font-normal">/mo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
