import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useState, useEffect } from 'react'
import { SearchModal } from '../search/SearchModal'

export function PublicLayout() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showNavbar, setShowNavbar] = useState(() => {
    if (location.pathname === '/') {
      return sessionStorage.getItem('pgr_splash_dismissed') === 'true'
    }
    return true
  })

  const isSearchOpen = searchParams.get('search') === 'true'
  const initialQuery = searchParams.get('q') || ''

  const handleSearchOpenChange = (open: boolean) => {
    const nextParams = new URLSearchParams(searchParams)
    if (open) {
      nextParams.set('search', 'true')
    } else {
      nextParams.delete('search')
    }
    setSearchParams(nextParams)
  }

  useEffect(() => {
    if (location.pathname === '/') {
      const dismissed = sessionStorage.getItem('pgr_splash_dismissed') === 'true'
      setShowNavbar(dismissed)

      const handleDismiss = () => {
        setShowNavbar(true)
      }

      window.addEventListener('splash-dismissed', handleDismiss)
      return () => {
        window.removeEventListener('splash-dismissed', handleDismiss)
      }
    } else {
      setShowNavbar(true)
    }
  }, [location.pathname])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {showNavbar && <Navbar className="animate-in fade-in duration-300" />}
      <main className="flex-1">
        <Outlet />
      </main>
      {showNavbar && <Footer />}
      <SearchModal
        open={isSearchOpen}
        onOpenChange={handleSearchOpenChange}
        initialQuery={initialQuery}
      />
    </div>
  )
}
