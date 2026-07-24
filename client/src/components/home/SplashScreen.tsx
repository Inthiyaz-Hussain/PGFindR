import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onDismiss: () => void
}

export function SplashScreen({ onDismiss }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFading(true)
      setTimeout(() => {
        setVisible(false)
        onDismiss()
      }, 400)
    }, 2000)
    return () => clearTimeout(timeout)
  }, [onDismiss])

  function handleTap() {
    setFading(true)
    setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, 300)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-400 cursor-pointer select-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleTap}
      aria-label="Loading SwiftPG"
    >
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(99,102,241,0.12)_0%,transparent_100%)]" />

      <div className="relative flex flex-col items-center gap-5">
        {/* Animated logo */}
        <img
          src="/logo-swiftpg.png"
          alt="SwiftPG Logo"
          className="h-20 w-20 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 animate-in zoom-in-50 duration-500"
        />

        {/* Brand name */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Swift<span className="text-indigo-450 dark:text-indigo-400 font-extrabold">PG</span>
          </h1>
          <p className="mt-2 text-sm text-indigo-200/70">
            India's trusted PG discovery platform
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 animate-in fade-in duration-500 delay-500">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary-foreground/50 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
