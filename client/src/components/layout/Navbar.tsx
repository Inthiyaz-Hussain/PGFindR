import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  Heart,
  Compass,
  PlusCircle,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  Sparkles,
  Bookmark,
  ShieldCheck,
  MessageSquare,
  UserCheck
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'



export interface NavbarProps {
  brandName?: string
  wishlistCount?: number
  onWishlistClick?: () => void
  className?: string
}

export function Navbar({
  wishlistCount: propWishlistCount = 3,
  onWishlistClick,
  className = '',
}: NavbarProps) {
  let user: any = null
  let profile: any = null
  let signOut: (() => void) | undefined = undefined

  try {
    const auth = useAuth()
    user = auth.user
    profile = auth.profile
    signOut = auth.signOut
  } catch {
    // Rendered outside AuthProvider context
  }

  const navigate = useNavigate()
  const pathname = window.location.pathname
  const isOwnerPath = pathname.startsWith('/owner')
  const isAdminPath = pathname.startsWith('/admin')
  const isSeekerPath = pathname.startsWith('/seeker')

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [savedCount, setSavedCount] = useState<number>(propWishlistCount)

  useEffect(() => {
    setSavedCount(propWishlistCount)
  }, [propWishlistCount])

  // User initials for avatar
  const userInitials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'JD'

  const userDisplayName = profile?.full_name || user?.email?.split('@')[0] || 'John Doe'


  const getDashboardPath = () => {
    if (profile?.role === 'owner') return '/owner'
    if (profile?.role === 'admin') return '/admin'
    return '/seeker'
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* ================= LEFT: BRAND LOGO ================= */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2.5 group transition-transform duration-200 active:scale-95"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-indigo-400 ring-1 ring-indigo-800/50 shadow-sm group-hover:shadow-indigo-950/20 group-hover:scale-105 transition-all">
                <Building2 className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-400 animate-pulse" />
              </div>
              <span className="text-xl font-bold tracking-tight text-indigo-950 dark:text-slate-100">
                Swift<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PG</span>
              </span>
            </Link>

            {/* Desktop Divider */}
            <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800 ml-1" />
          </div>

          {/* ================= CENTER: LOCATION SELECTOR PILL OR PORTAL TITLE ================= */}
          <div className="flex-1 max-w-xs sm:max-w-sm flex justify-center">
            {isOwnerPath ? (
              <span className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase bg-indigo-50/80 dark:bg-indigo-950/40 px-3.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-850/50 select-none">
                🏡 Owner Portal
              </span>
            ) : isAdminPath ? (
              <span className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 tracking-wider uppercase bg-purple-50/80 dark:bg-purple-950/40 px-3.5 py-1 rounded-full border border-purple-200/50 dark:border-purple-850/50 select-none">
                🛡️ Admin Console
              </span>
            ) : isSeekerPath ? (
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wider uppercase bg-slate-100/80 dark:bg-slate-800/40 px-3.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-750/50 select-none">
                🔍 Seeker Dashboard
              </span>
            ) : null}
          </div>

          {/* ================= RIGHT: LINKS, WISHLIST & PROFILE ================= */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {isOwnerPath ? (
              <>
                <Link
                  to="/owner"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Dashboard
                </Link>
                <Link
                  to="/owner/pgs"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  My PGs
                </Link>
                <Link
                  to="/owner/inquiries"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Inquiries
                </Link>
                <Link
                  to="/owner/earnings"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Earnings
                </Link>
                <Link
                  to="/owner/pgs/new"
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 px-3.5 py-1.5 rounded-full transition-all shadow-2xs hover:shadow-xs active:scale-95"
                >
                  <PlusCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Add PG</span>
                </Link>
              </>
            ) : isAdminPath ? (
              <>
                <Link
                  to="/admin"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/pgs"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Listings
                </Link>
                <Link
                  to="/admin/owners"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Owners
                </Link>
                <Link
                  to="/admin/transactions"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Transactions
                </Link>
              </>
            ) : isSeekerPath ? (
              <>
                <Link
                  to="/seeker"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Dashboard
                </Link>
                <Link
                  to="/search"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  <Compass className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Explore</span>
                </Link>
                <Link
                  to="/seeker/inquiries"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  Inquiries
                </Link>
                <button
                  onClick={() => navigate('/seeker/profile?tab=saved')}
                  className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition-colors cursor-pointer group"
                  title="View Wishlist"
                >
                  <Heart className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover:text-rose-500 group-hover:scale-110 transition-transform" />
                  {savedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold shadow-xs ring-2 ring-white dark:ring-slate-900 animate-in zoom-in-50">
                      {savedCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/search"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                >
                  <Compass className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>Explore</span>
                </Link>
                <button
                  onClick={() => {
                    if (onWishlistClick) {
                      onWishlistClick()
                    } else {
                      navigate('/seeker/profile?tab=saved')
                    }
                  }}
                  className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition-colors cursor-pointer group"
                  title="View Wishlist"
                >
                  <Heart className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover:text-rose-500 group-hover:scale-110 transition-transform" />
                  {savedCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-bold shadow-xs ring-2 ring-white dark:ring-slate-900 animate-in zoom-in-50">
                      {savedCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* Divider */}
            {user && <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />}

            {/* User Profile Avatar & Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-500 group"
                    aria-label="User Profile Menu"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-indigo-600/30 group-hover:border-indigo-600 transition-colors">
                        <AvatarImage src={profile?.avatar_url || ''} alt={userDisplayName} />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white text-xs font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-y-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 p-2 shadow-lg border-slate-200 dark:border-slate-800 rounded-xl">
                  {/* User Profile Header */}
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {userDisplayName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || 'user@swiftpg.com'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-medium">
                        <ShieldCheck className="h-3 w-3 mr-1 text-indigo-600" />
                        {profile?.role === 'owner' ? 'Property Owner' : profile?.role === 'admin' ? 'Admin' : 'Verified Seeker'}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem
                    onClick={() => navigate(getDashboardPath())}
                    className="cursor-pointer py-2 px-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/seeker/profile?tab=saved')}
                    className="cursor-pointer py-2 px-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200"
                  >
                    <Bookmark className="h-4 w-4 mr-2.5 text-rose-500" />
                    <span>Saved PGs ({savedCount})</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/owner')}
                    className="cursor-pointer py-2 px-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <PlusCircle className="h-4 w-4 mr-2.5 text-slate-500" />
                    <span>List New Property</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate('/seeker/profile')}
                    className="cursor-pointer py-2 px-3 rounded-lg text-xs sm:text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <User className="h-4 w-4 mr-2.5 text-slate-500" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem
                    onClick={() => {
                      if (signOut) signOut()
                      navigate('/auth/login')
                    }}
                    className="cursor-pointer py-2 px-3 rounded-lg text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 focus:bg-rose-50 focus:text-rose-600"
                  >
                    <LogOut className="h-4 w-4 mr-2.5 text-rose-500" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* ================= MOBILE HAMBURGER BUTTON ================= */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Wishlist Button */}
            <button
              onClick={() => {
                if (onWishlistClick) onWishlistClick()
                else navigate('/seeker/profile?tab=saved')
              }}
              className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5 text-rose-500" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Mobile Sheet Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Open Mobile Navigation Menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96 p-6 flex flex-col justify-between">
                <div>
                  <SheetHeader className="text-left border-b pb-4 mb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                      </div>
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Swift<span className="text-indigo-600">PG</span>
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  {/* Navigation Links */}
                  <nav className="space-y-1">
                    {isOwnerPath ? (
                      <>
                        <Link
                          to="/owner"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          to="/owner/pgs"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>My PGs</span>
                        </Link>
                        <Link
                          to="/owner/inquiries"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Inquiries</span>
                        </Link>
                        <Link
                          to="/owner/pgs/new"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors"
                        >
                          <PlusCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Add PG Listing</span>
                        </Link>
                      </>
                    ) : isAdminPath ? (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          to="/admin/pgs"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span>Listings</span>
                        </Link>
                        <Link
                          to="/admin/owners"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span>Owners</span>
                        </Link>
                      </>
                    ) : isSeekerPath ? (
                      <>
                        <Link
                          to="/seeker"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutDashboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          to="/search"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Compass className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Explore PGs</span>
                        </Link>
                        <Link
                          to="/seeker/inquiries"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Inquiries</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/search"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Compass className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span>Explore PGs</span>
                        </Link>
                        <Link
                          to="/seeker/profile?tab=saved"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Heart className="h-5 w-5 text-rose-500" />
                            <span>Wishlist / Saved PGs</span>
                          </div>
                          {savedCount > 0 && (
                            <Badge className="bg-rose-500 text-white text-xs">{savedCount}</Badge>
                          )}
                        </Link>
                      </>
                    )}
                  </nav>
                </div>

                {/* Mobile Bottom Profile Section */}
                <div className="border-t pt-4 space-y-3">
                  {user && (
                    <>
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        <Avatar className="h-10 w-10 border border-indigo-600/30">
                          <AvatarImage src={profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-indigo-950 text-white font-bold text-xs">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {userDisplayName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user?.email || 'user@swiftpg.com'}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          navigate(getDashboardPath())
                        }}
                        className="w-full bg-indigo-950 hover:bg-indigo-900 text-white cursor-pointer"
                      >
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Go to Dashboard
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMobileMenuOpen(false)
                          if (signOut) signOut()
                          navigate('/')
                        }}
                        className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  )
}
