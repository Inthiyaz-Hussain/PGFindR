import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Photo {
  id: string
  url: string
  type: 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom' | null
  caption: string | null
  is_primary: boolean
}

interface PhotoGalleryProps {
  photos: Photo[]
  name: string
}

export function PhotoGallery({ photos, name }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  })

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % sortedPhotos.length)
  }, [sortedPhotos.length])

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + sortedPhotos.length) % sortedPhotos.length)
  }, [sortedPhotos.length])

  if (sortedPhotos.length === 0) {
    return (
      <div className="relative h-64 md:h-96 rounded-xl bg-muted flex items-center justify-center">
        <span className="text-sm text-muted-foreground">No photos available</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative h-64 md:h-96 rounded-xl overflow-hidden bg-muted group">
        <img
          src={sortedPhotos[activeIndex]?.url}
          alt={sortedPhotos[activeIndex]?.caption || name}
          className="h-full w-full object-cover"
        />
        {/* Overlay controls */}
        <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={goPrev}
            className="h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={goNext}
            className="h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        {/* Fullscreen button */}
        <button
          onClick={() => setFullscreen(true)}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="View fullscreen"
        >
          <Maximize2 className="size-4" />
        </button>
        {/* Counter */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/50 text-white text-xs px-3 py-1 backdrop-blur-sm">
          {activeIndex + 1} / {sortedPhotos.length}
        </div>
        {/* Type badge */}
        {sortedPhotos[activeIndex]?.type && (
          <div className="absolute bottom-3 left-3 rounded-full bg-black/50 text-white text-xs px-3 py-1 backdrop-blur-sm capitalize">
            {sortedPhotos[activeIndex].type}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {sortedPhotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {sortedPhotos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg transition-all',
                i === activeIndex
                  ? 'ring-2 ring-primary ring-offset-1'
                  : 'opacity-60 hover:opacity-100'
              )}
            >
              <img src={photo.url} alt={photo.caption || ''} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-5xl p-0 border-0 bg-black/90">
          <div className="relative h-[80vh] flex items-center justify-center">
            <button
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            <img
              src={sortedPhotos[activeIndex]?.url}
              alt={sortedPhotos[activeIndex]?.caption || name}
              className="max-h-full max-w-full object-contain"
            />
            <button
              onClick={goPrev}
              className="absolute left-4 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <ChevronRight className="size-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 text-white text-sm px-4 py-1.5">
              {activeIndex + 1} / {sortedPhotos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
