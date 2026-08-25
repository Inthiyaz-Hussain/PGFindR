import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <ShieldAlert className="h-24 w-24 text-red-500 mb-8" />
      <h1 className="text-7xl font-extrabold text-slate-900 mb-4 tracking-tight">404</h1>
      <h2 className="text-2xl font-bold text-slate-700 mb-6 uppercase tracking-widest">Forbidden</h2>
      <p className="text-slate-500 text-center max-w-md mb-8 text-lg">
        The route you are trying to access is not available or has been restricted for security reasons.
      </p>
      <Link to="/">
        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all">
          Return Home
        </Button>
      </Link>
    </div>
  )
}
