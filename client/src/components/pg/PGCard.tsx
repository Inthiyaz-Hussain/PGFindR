import type { PGListing } from '@/types'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, BedDouble, Heart, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface PGCardProps {
  pg: PGListing & { distance_meters?: number | null }
  liveAvailableBeds?: number | null
  className?: string
}

export function PGCard({ pg, liveAvailableBeds = null, className }: PGCardProps) {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()

  const { data: savedIds } = useQuery({
    queryKey: ['saved-pg-ids'],
    queryFn: async () => {
      if (!user) {
        // Fallback to local storage for unauthenticated users
        const local = localStorage.getItem('savedPgs')
        return local ? JSON.parse(local) : []
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/seeker/saved/ids`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) return []
      return res.json()
    }
  })

  const isSaved = (pg as any).is_saved || savedIds?.includes(pg.id)

  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        // Toggle in localStorage
        const local = localStorage.getItem('savedPgs')
        let saved = local ? JSON.parse(local) : []
        let isNowSaved = false
        if (saved.includes(pg.id)) {
          saved = saved.filter((id: string) => id !== pg.id)
        } else {
          saved.push(pg.id)
          isNowSaved = true
        }
        localStorage.setItem('savedPgs', JSON.stringify(saved))
        // Dispatch event for other components to listen
        window.dispatchEvent(new Event('local-saved-pgs-updated'))
        return { message: isNowSaved ? 'PG saved successfully' : 'PG unsaved successfully' }
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/seeker/saved/${pg.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to toggle save')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-pg-ids'] })
      queryClient.invalidateQueries({ queryKey: ['saved-pgs'] })
      toast.success(data.message)
    },
    onError: (err: any) => toast.error(err.message)
  })

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const hasGoogleAuth = session?.user?.app_metadata?.provider === 'google' || user?.app_metadata?.provider === 'google'
    if (!hasGoogleAuth) {
      toast.error('Please sign in with Google to save a PG')
      return
    }
    toggleSaveMutation.mutate()
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/pg/${pg.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: pg.name,
          text: `Check out ${pg.name} on PGFindR!`,
          url: url
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  const primaryPhoto = pg.photos?.find((p) => p.is_primary) || pg.photos?.[0]
  const typeColor = {
    boys: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    girls: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'co-ed': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    coliving: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200'
  }

  function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const available = liveAvailableBeds !== null ? liveAvailableBeds : pg.available_beds

  function getAvailabilityBadge() {
    if (available === 0) {
      return { label: 'Full', variant: 'secondary' as const, className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 border-red-200' }
    }
    if (available <= 2) {
      return { label: `${available} left`, variant: 'default' as const, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 border-amber-200' }
    }
    return { label: `${available} beds`, variant: 'default' as const, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200' }
  }

  const availabilityBadge = getAvailabilityBadge()

  // Type assertion since `amenities` isn't strictly on PGListing type but is returned by API
  const amenitiesArray = (pg as any).amenities || []

  const hasWifi = pg.wifi_included || amenitiesArray.some((a: any) => a.key === 'wifi' && a.is_available)
  const hasFood = pg.food_included || amenitiesArray.some((a: any) => (a.key === 'food_veg' || a.key === 'food_nonveg') && a.is_available)
  const hasAC = pg.ac_rooms || amenitiesArray.some((a: any) => a.key === 'ac' && a.is_available)
  const hasParking = pg.parking || amenitiesArray.some((a: any) => a.key === 'parking' && a.is_available)
  const hasSecurity = pg.security_24x7 || amenitiesArray.some((a: any) => a.key === 'cctv' && a.is_available)

  const amenityIcons = [
    { show: hasWifi, image: '/images/icon-wifi.png', label: 'WiFi' },
    { show: hasFood, image: '/images/icon-food.png', label: 'Food' },
    { show: hasAC, image: '/images/icon-ac.png', label: 'AC' },
    { show: hasParking, image: '/images/icon-parking.png', label: 'Parking' },
    { show: hasSecurity, image: '/images/icon-cctv.png', label: 'Security' },
  ].filter((a) => a.show)

  return (
    <Link to={`/pg/${pg.id}`}>
      <Card className={cn('group overflow-hidden transition-all hover:shadow-md py-0 gap-0', className)}>
        {/* Photo */}
        <div className="relative h-48 overflow-hidden bg-muted">
          {primaryPhoto ? (
            <img
              src={primaryPhoto.url}
              alt={pg.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <BedDouble className="size-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
            <Badge className={cn('border-0 text-xs font-medium', typeColor[pg.pg_type as keyof typeof typeColor] || typeColor['coliving'])}>
              {pg.pg_type === 'coliving' || pg.pg_type === 'co-ed' ? 'Coliving' : pg.pg_type === 'boys' ? 'Boys' : 'Girls'}
            </Badge>
            <Badge variant={availabilityBadge.variant} className={cn('text-xs border', availabilityBadge.className)}>
              {availabilityBadge.label}
            </Badge>
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur hover:bg-background hover:text-foreground shadow-sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className={cn("h-8 w-8 rounded-full bg-background/80 backdrop-blur shadow-sm transition-colors", 
                isSaved ? "text-rose-500 hover:text-rose-600 hover:bg-background" : "text-muted-foreground hover:text-foreground hover:bg-background"
              )}
              onClick={handleToggleSave}
            >
              <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
            </Button>
          </div>
          {pg.distance_meters != null && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                {formatDistance(pg.distance_meters)} away
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
            {pg.name}
            {(pg as any).is_verified && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 font-semibold dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800 shrink-0">
                Verified
              </Badge>
            )}
          </h3>
          <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{pg.locality}, {pg.city}</span>
          </div>

          {/* Amenities */}
          {amenityIcons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {amenityIcons.slice(0, 4).map(({ image, label }) => (
                <div key={label} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground border shadow-sm">
                  <img src={image} alt={label} className="w-3.5 h-3.5 object-contain" />
                  {label}
                </div>
              ))}
              {amenityIcons.length > 4 && (
                <div className="flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground border shadow-sm">
                  +{amenityIcons.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Price */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <span className="text-lg font-bold">
                ₹{pg.monthly_rent_min.toLocaleString('en-IN')}
              </span>
              {pg.monthly_rent_max > pg.monthly_rent_min && (
                <span className="text-sm text-muted-foreground">
                  {' '}– ₹{pg.monthly_rent_max.toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xs text-muted-foreground">/month</span>
            </div>
            {pg.deposit_amount > 0 && (
              <span className="text-xs text-muted-foreground">
                ₹{pg.deposit_amount.toLocaleString('en-IN')} deposit
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
