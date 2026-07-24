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
  Star,
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

function getNearbyLandmarks(pg: { locality: string; city: string; name: string }) {
  const locality = pg.locality?.toLowerCase() || ''
  const name = pg.name?.toLowerCase() || ''
  
  const landmarks: Array<{ name: string; type: string; distance: string; icon: any }> = []

  if (locality.includes('indiranagar')) {
    landmarks.push({ name: 'Indiranagar Metro Station', type: 'Metro Station', distance: '0.4 km', icon: Train })
    landmarks.push({ name: '100 Feet Road Shopping Hub', type: 'Shopping & Dining', distance: '0.3 km', icon: ShoppingBag })
    landmarks.push({ name: 'ESI Hospital', type: 'Healthcare', distance: '1.1 km', icon: Hospital })
    landmarks.push({ name: 'Toit Brewpub / Restaurants', type: 'Food & Hangout', distance: '0.6 km', icon: Utensils })
  } else if (locality.includes('andheri')) {
    landmarks.push({ name: 'JB Nagar Metro Station', type: 'Metro Station', distance: '0.3 km', icon: Train })
    landmarks.push({ name: 'SEEPZ IT Park', type: 'Business Hub', distance: '1.4 km', icon: ShoppingBag })
    landmarks.push({ name: 'Seven Hills Hospital', type: 'Healthcare', distance: '1.8 km', icon: Hospital })
    landmarks.push({ name: 'Andheri Kurla Road', type: 'Commercial Street', distance: '0.5 km', icon: Bus })
  } else if (locality.includes('south extension') || locality.includes('south ex')) {
    landmarks.push({ name: 'South Extension Metro Station', type: 'Metro Station', distance: '0.3 km', icon: Train })
    landmarks.push({ name: 'South Ex Part 2 Market', type: 'Shopping Hub', distance: '0.2 km', icon: ShoppingBag })
    landmarks.push({ name: 'AIIMS Delhi', type: 'Healthcare', distance: '2.3 km', icon: Hospital })
  } else if (locality.includes('saket')) {
    landmarks.push({ name: 'Saket Metro Station', type: 'Metro Station', distance: '0.5 km', icon: Train })
    landmarks.push({ name: 'Select CITYWALK Mall', type: 'Shopping Mall', distance: '0.6 km', icon: ShoppingBag })
    landmarks.push({ name: 'Max Super Speciality Hospital', type: 'Healthcare', distance: '0.9 km', icon: Hospital })
  } else if (locality.includes('sector 62')) {
    landmarks.push({ name: 'Sector 62 Metro Station', type: 'Metro Station', distance: '0.5 km', icon: Train })
    landmarks.push({ name: 'Logix Cyber Park', type: 'IT Hub', distance: '0.8 km', icon: ShoppingBag })
    landmarks.push({ name: 'Fortis Hospital', type: 'Healthcare', distance: '1.2 km', icon: Hospital })
  } else if (locality.includes('sector 18')) {
    landmarks.push({ name: 'Sector 18 Metro Station', type: 'Metro Station', distance: '0.2 km', icon: Train })
    landmarks.push({ name: 'DLF Mall of India', type: 'Shopping Mall', distance: '0.4 km', icon: ShoppingBag })
    landmarks.push({ name: 'Sector 18 Market', type: 'Commercial Hub', distance: '0.1 km', icon: Utensils })
  } else if (locality.includes('dlf phase 2') || locality.includes('cyber city') || name.includes('cyber city')) {
    landmarks.push({ name: 'DLF Cyber City Rapid Metro', type: 'Rapid Metro', distance: '0.4 km', icon: Train })
    landmarks.push({ name: 'DLF CyberHub', type: 'Food & Entertainment', distance: '0.5 km', icon: Utensils })
    landmarks.push({ name: 'Ambience Mall Gurgaon', type: 'Shopping Mall', distance: '1.8 km', icon: ShoppingBag })
  } else if (locality.includes('golf course road') || locality.includes('sector 43') || name.includes('golf course')) {
    landmarks.push({ name: 'Sector 42-43 Rapid Metro', type: 'Rapid Metro', distance: '0.6 km', icon: Train })
    landmarks.push({ name: 'One Horizon Center', type: 'Corporate Park', distance: '0.8 km', icon: ShoppingBag })
    landmarks.push({ name: 'Paras Hospital', type: 'Healthcare', distance: '1.5 km', icon: Hospital })
  } else {
    const prettyLocality = pg.locality || 'Local'
    landmarks.push({ name: `${prettyLocality} Metro/Bus Station`, type: 'Transit', distance: '0.6 km', icon: Train })
    landmarks.push({ name: `${prettyLocality} Shopping Plaza`, type: 'Shopping & Groceries', distance: '0.8 km', icon: ShoppingBag })
    landmarks.push({ name: `${prettyLocality} Multi-speciality Hospital`, type: 'Healthcare', distance: '1.5 km', icon: Hospital })
    landmarks.push({ name: `Local Restaurants & Cafes`, type: 'Food', distance: '0.3 km', icon: Utensils })
  }

  return landmarks
}

function getTestimonials(pg: { pg_type: string }) {
  const testimonials = {
    boys: [
      {
        quote: "Awesome place! The high-speed internet and power backup are perfect for my work-from-home schedule. Clean rooms and great food.",
        name: "Rahul Sharma",
        role: "Software Engineer",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
        rating: 5
      },
      {
        quote: "Very close to the metro station, makes daily commute to office extremely easy. Highly recommend for working professionals.",
        name: "Aman Verma",
        role: "Data Analyst",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
        rating: 5
      }
    ],
    girls: [
      {
        quote: "Safety is top-notch here with biometric entry and 24/7 security. The warden is friendly and the housekeeping is daily.",
        name: "Priya Nair",
        role: "Student, Delhi University",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
        rating: 5
      },
      {
        quote: "Loved the community events and the rooftop lounge. Food is really good and feels like home. Best ladies PG in this area.",
        name: "Ananya Das",
        role: "UX Designer",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
        rating: 5
      }
    ],
    'co-ed': [
      {
        quote: "Perfect coliving space. The gym and recreation area are fantastic. Met amazing people from different industries here.",
        name: "Vikram Malhotra",
        role: "Product Manager",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120",
        rating: 5
      },
      {
        quote: "Super convenient location. Rooms are spacious and well-ventilated. The support staff is very responsive to any complaints.",
        name: "Sneha Gupta",
        role: "HR Specialist",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
        rating: 5
      }
    ]
  }

  const type = pg.pg_type as 'boys' | 'girls' | 'co-ed'
  return testimonials[type] || testimonials['co-ed']
}

export function PGDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: _user } = useAuth()
  const [selectedSharing, setSelectedSharing] = useState<SharingTypeItem | null>(null)
  const [reviewOffset, setReviewOffset] = useState(0)

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pgs/${id}`)
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pgs/${id}/reviews?limit=${REVIEW_LIMIT}&offset=${reviewOffset}`)
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
      let res = await fetch(`${import.meta.env.VITE_API_URL}/api/pgs?q=${encodeURIComponent(pg.locality)}&limit=10`)
      if (!res.ok) throw new Error('Failed to load nearby PGs')
      let result = await res.json()
      
      const filtered = (result.data || []).filter((item: any) => item.id !== pg.id)
      if (filtered.length === 0) {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/pgs?q=${encodeURIComponent(pg.city)}&limit=10`)
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

          {/* Location & Connectivity */}
          <section className="space-y-4">
            <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">Location & Connectivity</h2>
            {pg.latitude && pg.longitude ? (
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
                    src={`https://maps.google.com/maps?q=${pg.latitude},${pg.longitude}&z=15&output=embed`}
                  />
                </div>
                <div className="p-4 bg-muted/30">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">Exact Address</div>
                      <div className="text-sm text-muted-foreground">{pg.address}, {pg.locality}, {pg.city}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 text-muted-foreground">
                <MapPin className="size-5" />
                <span className="text-sm">Location coordinates not available. Address: {pg.address}, {pg.locality}, {pg.city}</span>
              </div>
            )}

            {/* Nearby Transit & Landmarks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getNearbyLandmarks(pg).map((landmark, idx) => {
                const Icon = landmark.icon
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
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

          {/* Testimonials */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">Resident Testimonials</h2>
              <span className="text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">
                Verified Residents
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getTestimonials(pg).map((testi, idx) => (
                <div 
                  key={idx} 
                  className="relative group overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  <div className="absolute top-2 right-4 text-primary/10 text-6xl font-serif select-none pointer-events-none group-hover:text-primary/15 transition-colors">
                    “
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm italic text-muted-foreground leading-relaxed">
                      "{testi.quote}"
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-3 relative z-10">
                    <img 
                      src={testi.avatar} 
                      alt={testi.name} 
                      className="size-10 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                    />
                    <div>
                      <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {testi.name}
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500" title="Verified Resident" />
                      </div>
                      <div className="text-xs text-muted-foreground">{testi.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                'co-ed': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200/50'
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
                      <Badge className={cn('border text-[10px] font-medium px-1.5 py-0.5', typeColor[nearbyPg.pg_type as keyof typeof typeColor] || typeColor['co-ed'])}>
                        {nearbyPg.pg_type === 'co-ed' ? 'Co-ed' : nearbyPg.pg_type === 'boys' ? 'Boys' : 'Girls'}
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
