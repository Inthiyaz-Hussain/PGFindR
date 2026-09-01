import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function SavedPGsPage() {
  const [savedPgs, setSavedPgs] = useState<any[]>([])

  useEffect(() => {
    // Ideally this would fetch from backend, but for now we'll just show empty state or mock data
    // based on local storage if we had implemented it, or just a placeholder since the app
    // seems to use propWishlistCount in Navbar.
    setSavedPgs([])
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="size-6 text-rose-500 fill-rose-500" /> Saved PGs
        </h1>
        <p className="text-muted-foreground mt-1">Your liked properties</p>
      </div>

      {savedPgs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPgs.map((pg) => (
            <Card key={pg.id}>
              <CardContent className="p-4">
                <div className="font-semibold">{pg.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="size-4" /> {pg.locality}, {pg.city}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <div className="max-w-md mx-auto space-y-4">
            <Heart className="size-12 text-rose-300 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">You haven't saved any PGs yet.</p>
            <p className="text-xs text-slate-500">Explore paying guest accommodations and tap the heart icon to save them here for later.</p>
            <Link to="/search" className="inline-block mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-5 py-2.5 transition-colors">
              Explore PGs
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
