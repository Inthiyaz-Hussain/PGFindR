import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SplashScreen } from '@/components/home/SplashScreen'

export function HomePage() {
  const navigate = useNavigate()
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('pgr_splash_dismissed') !== 'true'
  })

  useEffect(() => {
    if (sessionStorage.getItem('pgr_splash_dismissed') === 'true') {
      navigate('/search')
    }
  }, [navigate])

  function handleSplashDismiss() {
    setShowSplash(false)
    sessionStorage.setItem('pgr_splash_dismissed', 'true')
    window.dispatchEvent(new CustomEvent('splash-dismissed'))
    navigate('/search')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onDismiss={handleSplashDismiss} />}
    </div>
  )
}
