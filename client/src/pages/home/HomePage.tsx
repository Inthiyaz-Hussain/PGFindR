import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Building2, 
  Compass, 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  ArrowRight, 
  X, 
  BedDouble, 
  Globe, 
  CheckCircle, 
  Building, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Save,
  MapPin,
  Sparkles,
  PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'

import { SplashScreen } from '@/components/home/SplashScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { supabaseUntyped } from '@/lib/supabase'
import './onboarding.css'

export function HomePage() {
  const navigate = useNavigate()
  const { user, profile, loading, register, login } = useAuth()
  const [showSplash, setShowSplash] = useState(() => {
    return sessionStorage.getItem('pgr_splash_dismissed') !== 'true'
  })
  
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const [showOwnerLanding, setShowOwnerLanding] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  // Owner Registration Form State
  const [registerStep, setRegisterStep] = useState(1)
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [registering, setRegistering] = useState(false)

  // Property Details State
  const [regPgName, setRegPgName] = useState('')
  const [regPgCity, setRegPgCity] = useState('')
  const [regPgType, setRegPgType] = useState('co-ed')
  const [regPgAddress, setRegPgAddress] = useState('')
  const [regPgLocality, setRegPgLocality] = useState('')

  // Auto-redirect logged-in users after splash screen is dismissed
  useEffect(() => {
    if (!showSplash && !loading) {
      if (user && profile) {
        const role = profile.role
        const dashboard = role === 'owner' ? '/owner' : role === 'admin' ? '/admin' : '/seeker'
        navigate(dashboard, { replace: true })
      } else {
        setShowChoiceModal(true)
      }
    }
  }, [showSplash, user, profile, loading, navigate])

  function handleSplashDismiss() {
    setShowSplash(false)
    sessionStorage.setItem('pgr_splash_dismissed', 'true')
    window.dispatchEvent(new CustomEvent('splash-dismissed'))
  }

  const handleLookingForPG = () => {
    setShowChoiceModal(false)
    navigate('/search')
  }

  const handleWantToListPG = () => {
    setShowChoiceModal(false)
    setShowOwnerLanding(true)
  }

  const resetFormState = () => {
    setRegFullName('')
    setRegEmail('')
    setRegPhone('')
    setRegPassword('')
    setRegPgName('')
    setRegPgCity('')
    setRegPgAddress('')
    setRegPgLocality('')
    setRegPgType('co-ed')
    setRegisterStep(1)
    setShowPassword(false)
  }

  const handleOwnerRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (registerStep === 1) {
      if (!regFullName || !regEmail || !regPhone || !regPassword) {
        toast.error('Please fill out all personal details')
        return
      }
      setRegisterStep(2)
      return
    }

    if (!regPgName || !regPgCity || !regPgAddress || !regPgLocality) {
      toast.error('Please fill out all property details')
      return
    }

    setRegistering(true)
    try {
      const { error: regError } = await register({
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        role: 'owner',
        phone: regPhone
      })
      if (regError) {
        toast.error(regError.message || 'Registration failed')
        setRegistering(false)
        return
      }
      
      // Auto login after registration
      const { error: loginError } = await login(regEmail, regPassword)
      if (loginError) {
        setRegistering(false)
        toast.success('Registered successfully! Please sign in.')
        navigate('/auth/login?role=owner')
        return
      }

      // Create initial PG listing automatically
      try {
        const { data: userData } = await supabaseUntyped.auth.getUser()
        if (userData?.user) {
          const { error: listingError } = await supabaseUntyped
            .from('pg_listings')
            .insert({
              owner_id: userData.user.id,
              name: regPgName,
              city: regPgCity,
              locality: regPgLocality,
              address: regPgAddress,
              pg_type: regPgType,
              description: `Welcome to ${regPgName}! A premium verified PG accommodation located in ${regPgLocality}, ${regPgCity}.`,
              status: 'pending'
            })
          if (listingError) {
            console.error('Error inserting initial PG listing:', listingError.message)
          }
        }
      } catch (err) {
        console.error('Failed to create initial listing:', err)
      }

      setRegistering(false)
      toast.success('Account & PG listing created successfully!')
      resetFormState()
      navigate('/owner', { replace: true })
      setShowRegisterModal(false)
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during registration')
      setRegistering(false)
    }
  }

  function renderRegisterModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Close button */}
          <button
            onClick={() => {
              setShowRegisterModal(false)
              resetFormState()
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-400">
            <span className={registerStep === 1 ? 'text-indigo-400 underline underline-offset-4' : ''}>1. Account Details</span>
            <span className="text-slate-700">|</span>
            <span className={registerStep === 2 ? 'text-indigo-400 underline underline-offset-4' : ''}>2. Property Details</span>
          </div>

          {/* Title */}
          <div className="space-y-1.5 text-center">
            <h3 className="text-xl font-bold text-white">Owner Registration</h3>
            <p className="text-xs text-slate-400">
              {registerStep === 1 
                ? 'Fill in your personal credentials' 
                : 'Add basic details of your PG property to get listed'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleOwnerRegister} className="space-y-4">
            {registerStep === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="John Doe"
                      className="pl-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="pl-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="pl-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold active:scale-95 duration-150"
                >
                  Next: Property Details
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">PG / Property Name</label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      type="text"
                      required
                      value={regPgName}
                      onChange={(e) => setRegPgName(e.target.value)}
                      placeholder="e.g. Royal Palace Premium PG"
                      className="pl-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                      <Input
                        type="text"
                        required
                        value={regPgCity}
                        onChange={(e) => setRegPgCity(e.target.value)}
                        placeholder="e.g. Bangalore"
                        className="pl-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Locality</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                      <Input
                        type="text"
                        required
                        value={regPgLocality}
                        onChange={(e) => setRegPgLocality(e.target.value)}
                        placeholder="e.g. Whitefield"
                        className="pl-10 bg-slate-950/40 border-slate-800 text-white rounded-xl placeholder:text-slate-600 focus-visible:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Full Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 size-4 text-slate-500" />
                    <textarea
                      required
                      value={regPgAddress}
                      onChange={(e) => setRegPgAddress(e.target.value)}
                      placeholder="e.g. #42, 3rd Cross, Whitefield Main Road, Near ITPL, Bangalore"
                      rows={2}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-800 text-sm text-white rounded-xl placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">PG Type / Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['boys', 'girls', 'co-ed'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRegPgType(t)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          regPgType === t
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRegisterStep(1)}
                    className="w-1/3 rounded-xl border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={registering}
                    className="w-2/3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold active:scale-95 duration-150"
                  >
                    {registering ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
                    Complete Register
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  if (showSplash) {
    return <SplashScreen onDismiss={handleSplashDismiss} />
  }

  if (showOwnerLanding) {
    return (
      <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-12 px-4 sm:px-6 lg:px-8 text-slate-100 overflow-hidden select-none">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse duration-4000" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse duration-6000" />

        <div className="relative max-w-5xl w-full mx-auto flex flex-col flex-1">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-8">
            <button
              onClick={() => {
                setShowOwnerLanding(false)
                setShowChoiceModal(true)
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2.5">
              <img src="/logo-swiftpg.png" alt="FindPgR" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-lg font-bold tracking-tight text-white">
                Find<span className="text-indigo-400 font-extrabold">PgR</span>
              </span>
            </div>
            {/* Blinking Button 1 (Top Header) */}
            <Button
              asChild
              className="blink-btn-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 text-sm shadow-lg border border-indigo-400/20 active:scale-95 duration-150"
            >
              <Link to="/owner/register" className="flex items-center">
                <PlusCircle className="h-4 w-4 mr-2" />
                List Your PG
              </Link>
            </Button>
          </div>

          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              🏡 Owner Partnership Program
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Grow Your PG Rental Business Digitally
            </h1>
            <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
              FindPgR connects you directly with thousands of verified seekers. Maximize occupancy, simplify bed management, and establish a premium digital presence.
            </p>
          </div>

          {/* Features Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Feature 1: Get Tenants */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <User className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Get Verified Tenants</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  List your PG and reach verified corporate professionals and students instantly. Say goodbye to middleman fees and brokers.
                </p>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-indigo-400" />
                  Direct seeker inquiries
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-indigo-400" />
                  Zero broker commission dependency
                </li>
              </ul>
            </div>

            {/* Feature 2: Manage Empty Beds */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <BedDouble className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Manage Room & Bed Inventory</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  An intuitive dashboard lets you track available beds, occupied rooms, maintenance statuses, and rent pricing in real-time.
                </p>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-indigo-400" />
                  Bed-level availability tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-indigo-400" />
                  Instant vacancy updates
                </li>
              </ul>
            </div>

            {/* Feature 3: Digital Presence */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 hover:border-indigo-500/30 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Digital Brand Presence</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Get a dedicated property listing page complete with photo galleries, amenities list, verified tags, and direct map locations.
                </p>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-indigo-400" />
                  Dedicated public listing page
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-indigo-400" />
                  Photo galleries & map location
                </li>
              </ul>
            </div>
          </div>

          {/* Blinking Button 2 (Middle Section) */}
          <div className="flex justify-center mb-12">
            <Button
              asChild
              className="blink-btn-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-6 text-base shadow-xl border border-indigo-400/20 active:scale-95 duration-150"
            >
              <Link to="/owner/register" className="flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                List Your PG
              </Link>
            </Button>
          </div>

          {/* Bottom Call to Action Section */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/20 p-8 sm:p-10 text-center relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="relative space-y-6 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to maximize your PG revenue?</h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Join our platform in under 2 minutes. Enter your basic details and configure your rooms/beds to start receiving bookings.
              </p>
              <div className="pt-2 flex justify-center">
                {/* Blinking Button 3 (Bottom Section) */}
                <Button
                  asChild
                  className="blink-btn-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-6 text-base shadow-xl border border-indigo-400/20 active:scale-95 duration-150"
                >
                  <Link to="/owner/register" className="flex items-center">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    List Your PG
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Register Modal Form */}
        {showRegisterModal && renderRegisterModal()}
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 py-16 px-4 overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse duration-4000" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse duration-6000" />

      <div className="relative max-w-5xl w-full text-center space-y-12">
        {/* Header Section */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            ✨ Welcome to FindPgR
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Choose Your Portal to Get Started
          </h1>
          <p className="text-base md:text-lg text-slate-400 leading-relaxed">
            Whether you are searching for a premium verified PG, listing your properties, or administering the platform, select your gateway below.
          </p>
        </div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-8">
          {/* Card 1: Seeker */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all duration-300">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Compass className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Seeker / Tenant</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Find and book verified premium PG accommodations. Enjoy easy online booking, real-time availability updates, and secure monthly rent payments.
              </p>
            </div>
            <div className="space-y-3 mt-8">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs">
                  <Link to="/auth/login?role=seeker">
                    <LogIn className="size-4 shrink-0" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full rounded-xl border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-semibold">
                  <Link to="/auth/register?role=seeker">
                    <UserPlus className="size-4 shrink-0" />
                    Sign Up
                  </Link>
                </Button>
              </div>
              <Button asChild variant="ghost" className="w-full rounded-xl hover:bg-slate-800 hover:text-indigo-400 text-slate-400 transition-colors text-xs font-semibold py-1">
                <Link to="/search" className="flex items-center justify-center gap-1">
                  Explore as Guest <ArrowRight className="h-3 w-3 animate-bounce-horizontal" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 2: Owner */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all duration-300">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Property Owner</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                List your PG properties, manage room inventory, accept bookings from verified tenants, verify KYC documentation, and track your monthly earnings.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-8">
              <Button asChild className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs border-0">
                <Link to="/auth/login?role=owner">
                  <LogIn className="size-4 shrink-0" />
                  Sign In
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-semibold">
                <Link to="/auth/register?role=owner">
                  <UserPlus className="size-4 shrink-0" />
                  Register
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 3: Admin */}
          <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl hover:border-purple-500/40 hover:bg-slate-900/80 transition-all duration-300">
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">System Admin</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Platform administration console. Moderate property listings, review and verify owner payouts and KYC credentials, and manage global commissions.
              </p>
            </div>
            <div className="mt-8">
              <Button asChild className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs">
                <Link to="/auth/login?role=admin">
                  <LogIn className="size-4 shrink-0" />
                  Access Admin Panel
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Choice Modal */}
      {showChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">How can we help you?</h2>
              <p className="text-sm text-slate-400">Please choose one option to get started</p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              <button
                onClick={handleLookingForPG}
                className="group flex flex-col items-center justify-center p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-indigo-950/30 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-center transition-all duration-300 active:scale-98 cursor-pointer"
              >
                <Compass className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="mt-3 text-base font-bold text-white group-hover:text-indigo-400 transition-colors">Looking for PG</span>
                <span className="mt-1 text-xs text-slate-400 max-w-[220px]">Find verified co-living spaces and check availability</span>
              </button>

              <button
                onClick={handleWantToListPG}
                className="group flex flex-col items-center justify-center p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-indigo-950/30 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-center transition-all duration-300 active:scale-98 cursor-pointer"
              >
                <Building className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
                <span className="mt-3 text-base font-bold text-white group-hover:text-indigo-400 transition-colors">Want to List PG</span>
                <span className="mt-1 text-xs text-slate-400 max-w-[220px]">Get tenants fast, manage room inventory, and grow digitally</span>
              </button>
            </div>

            {/* Footer Sign In Links */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center gap-2 text-xs">
              <div className="text-slate-400">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Sign In
                </Link>
              </div>
              <Link to="/admin/login" className="text-slate-500 hover:text-slate-400 transition-colors">
                System Admin Access
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
