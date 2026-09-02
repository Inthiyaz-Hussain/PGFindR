import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Loader2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { PGCard } from '@/components/pg/PGCard'

export function SavedPGsPage() {
  const { user, session } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleLocalUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['saved-pgs'] })
      queryClient.invalidateQueries({ queryKey: ['saved-pg-ids'] })
    }
    window.addEventListener('local-saved-pgs-updated', handleLocalUpdate)
    return () => window.removeEventListener('local-saved-pgs-updated', handleLocalUpdate)
  }, [queryClient])

  const { data: savedPgs, isLoading } = useQuery({
    queryKey: ['saved-pgs'],
    queryFn: async () => {
      if (!user) {
        const local = localStorage.getItem('savedPgs')
        const pgIds = local ? JSON.parse(local) : []
        if (pgIds.length === 0) return []
        
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/seeker/saved/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgIds })
        })
        if (!res.ok) throw new Error('Failed to fetch batch PGs')
        return res.json()
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://swiftpg-backend.onrender.com'}/api/seeker/saved`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch saved PGs')
      return res.json()
    }
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="size-6 text-rose-500 fill-rose-500" /> Saved PGs
        </h1>
        <p className="text-muted-foreground mt-1">Your liked properties</p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : savedPgs && savedPgs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPgs.map((pg: any) => (
            <PGCard key={pg.id} pg={pg} />
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
            {!user && (
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Want to save across devices?</p>
                <Link to="/login" className="inline-block text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Log in to sync
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
