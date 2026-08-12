import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseUntyped } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface RegisterOptions {
  email: string
  password: string
  fullName: string
  role: string
  phone?: string
}

interface AuthContextType {
  // State
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isLoading: boolean
  profileLoading: boolean

  // Primary API (matches requested interface)
  login: (email: string, password: string) => Promise<{ error: Error | null; profile: Profile | null }>
  logout: () => Promise<void>
  register: (opts: RegisterOptions) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>

  // Legacy aliases kept for backward compat
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, role: string, phone?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>

  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Guard against state updates after unmount / double-fire
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function fetchProfile(userId: string): Promise<Profile | null> {
    setProfileLoading(true)
    const isDemoId = userId === '00000000-0000-0000-0000-000000000003' || 
                     userId === '00000000-0000-0000-0000-000000000002' || 
                     userId === '00000000-0000-0000-0000-000000000001'
    if (isDemoId) {
      const role = userId === '00000000-0000-0000-0000-000000000003' ? 'admin' : userId === '00000000-0000-0000-0000-000000000002' ? 'owner' : 'seeker'
      const savedProfile = localStorage.getItem(`demo_profile_${role}`)
      const p: Profile = savedProfile ? JSON.parse(savedProfile) : {
        id: userId,
        full_name: role.charAt(0).toUpperCase() + role.slice(1) + ' Test User',
        role: role as UserRole,
        phone: '+91 9999999999',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        onboarding_verified: true,
      }
      if (mounted.current) setProfile(p)
      setProfileLoading(false)
      return p
    }

    try {
      const { data } = await supabaseUntyped
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      const p = data as any
      if (p && p.role === 'owner' && !p.onboarding_verified) {
        // Self-heal: If they have existing PG listings, they should be onboarding verified
        const { data: listings } = await supabaseUntyped
          .from('pg_listings')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
        if (listings && listings.length > 0) {
          await supabaseUntyped
            .from('profiles')
            .update({ onboarding_verified: true, onboarding_verified_at: new Date().toISOString() })
            .eq('id', userId)
          p.onboarding_verified = true
        }
      }
      if (mounted.current) setProfile(p)
      return p
    } catch (e) {
      console.error('Error fetching profile:', e)
      return null
    } finally {
      if (mounted.current) setProfileLoading(false)
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function updateProfile(updates: Partial<Profile>): Promise<{ error: Error | null }> {
    const isDemoId = user?.id === '00000000-0000-0000-0000-000000000003' || 
                     user?.id === '00000000-0000-0000-0000-000000000002' || 
                     user?.id === '00000000-0000-0000-0000-000000000001'
    if (isDemoId && user) {
      const role = user.id === '00000000-0000-0000-0000-000000000003' ? 'admin' : user.id === '00000000-0000-0000-0000-000000000002' ? 'owner' : 'seeker'
      const currentProfile: Profile = profile || {
        id: user.id,
        full_name: role.charAt(0).toUpperCase() + role.slice(1) + ' Test User',
        role: role as UserRole,
        phone: '+91 9999999999',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const updatedProfile: Profile = { ...currentProfile, ...updates, updated_at: new Date().toISOString() }
      localStorage.setItem(`demo_profile_${role}`, JSON.stringify(updatedProfile))
      if (mounted.current) setProfile(updatedProfile)
      
      // Keep demo session in sync
      const savedDemoSessionStr = localStorage.getItem('demo_session')
      if (savedDemoSessionStr) {
        try {
          const demoSession = JSON.parse(savedDemoSessionStr)
          demoSession.profile = updatedProfile
          localStorage.setItem('demo_session', JSON.stringify(demoSession))
        } catch (e) {
          console.error('Error updating demo session profile:', e)
        }
      }
      return { error: null }
    }
    
    if (!user) return { error: new Error('User not authenticated') }
    
    try {
      const { error } = await supabaseUntyped
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      if (error) return { error: error as Error | null }
      await refreshProfile()
      return { error: null }
    } catch (e: any) {
      return { error: e as Error | null }
    }
  }

    async function syncProfileWithAuthSession(session: Session | null) {
      if (!session?.user) {
        if (mounted.current) setProfile(null)
        return
      }
      
      let p = await fetchProfile(session.user.id)
      
      const isDemoId = session.user.id === '00000000-0000-0000-0000-000000000003' || 
                       session.user.id === '00000000-0000-0000-0000-000000000002' || 
                       session.user.id === '00000000-0000-0000-0000-000000000001'
      if (isDemoId) return // Skip sync for demo accounts
      
      // Fallback check: if profile is not created or doesn't have details, create/update it
      if (!p) {
        const rawMetadata = session.user.user_metadata
        const fullName = rawMetadata?.full_name || rawMetadata?.name || ''
        const avatarUrl = rawMetadata?.avatar_url || rawMetadata?.picture || ''
        const role = rawMetadata?.role || 'seeker'
        
        try {
          const { error: insertError } = await supabaseUntyped
            .from('profiles')
            .insert({
              id: session.user.id,
              full_name: fullName,
              avatar_url: avatarUrl,
              role: role
            })
          if (!insertError) {
            await fetchProfile(session.user.id)
          }
        } catch (err) {
          console.error('Error creating profile fallback:', err)
        }
      } else if (!p.avatar_url && session.user.user_metadata?.picture) {
        // Sync avatar url if not present in profile but available in Google metadata
        const avatarUrl = session.user.user_metadata.picture || session.user.user_metadata.avatar_url || ''
        if (avatarUrl) {
          try {
            await supabaseUntyped
              .from('profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', session.user.id)
            await fetchProfile(session.user.id)
          } catch (err) {
            console.error('Error syncing profile avatar fallback:', err)
          }
        }
      }
    }

  useEffect(() => {
    // 1. Check inactivity timeout (for both real and demo sessions)
    const lastActive = localStorage.getItem('last_active_time')
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000
    
    if (lastActive) {
      const timeSinceActive = Date.now() - Number(lastActive)
      if (timeSinceActive > threeDaysMs) {
        console.log('Session expired due to 3 days of inactivity. Signing out...')
        localStorage.removeItem('demo_session')
        localStorage.removeItem('last_active_time')
        if (mounted.current) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
        supabase.auth.signOut()
        return
      }
    }
    
    // Update last active time to now (since they just opened the app/tab)
    localStorage.setItem('last_active_time', String(Date.now()))

    // 2. Check if there is an active demo session
    const savedDemoSessionStr = localStorage.getItem('demo_session')
    if (savedDemoSessionStr) {
      try {
        const demoSession = JSON.parse(savedDemoSessionStr)
        console.log('Restoring demo session from localStorage...')
        if (mounted.current) {
          setSession(demoSession.session)
          setUser(demoSession.user)
          setProfile(demoSession.profile)
          setLoading(false)
        }
        return // Do NOT listen to onAuthStateChange for demo sessions!
      } catch (e) {
        console.error('Error parsing demo session from localStorage:', e)
        localStorage.removeItem('demo_session')
      }
    }

    // 3. Listen to auth state changes to drive initial load and session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return
      
      console.log('Auth state change event:', event, session?.user?.email)
      
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('demo_session')
        localStorage.removeItem('last_active_time')
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setSession(session)
      setUser(session?.user ?? null)

      if (session) {
        localStorage.setItem('last_active_time', String(Date.now()))
        setProfileLoading(true)
        try {
          await syncProfileWithAuthSession(session)
        } catch (err) {
          console.error('Error syncing profile:', err)
        } finally {
          if (mounted.current) {
            setProfileLoading(false)
            setLoading(false)
          }
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

// Helper to construct mock session and profile for demo credentials when Supabase is unverified or errors out
function getDemoMockData(email: string) {
  const role = email.includes('admin') ? 'admin' : email.includes('owner') ? 'owner' : 'seeker'
  const id = role === 'admin' ? '00000000-0000-0000-0000-000000000003' : role === 'owner' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001'
  
  const savedProfile = localStorage.getItem(`demo_profile_${role}`)
  const mockProfile = savedProfile ? JSON.parse(savedProfile) : {
    id,
    full_name: role.charAt(0).toUpperCase() + role.slice(1) + ' Test User',
    role,
    phone: '+91 9999999999',
    created_at: new Date().toISOString(),
  }
  
  const mockUser = {
    id,
    email,
    user_metadata: { full_name: mockProfile.full_name, role },
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any
  
  const mockSession = {
    access_token: `mock-token-${JSON.stringify({ id, email, role })}`,
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    user: mockUser,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  } as any
  
  return { user: mockUser, profile: mockProfile, session: mockSession }
}

  // ── login ──────────────────────────────────────────────────────────────────
  async function login(
    email: string,
    password: string
  ): Promise<{ error: Error | null; profile: Profile | null }> {
    const isDemo =
      (email === 'owner@swiftpg.demo' && password === 'Owner@123') ||
      (email === 'admin@swiftpg.demo' && password === 'Admin@123') ||
      (email === 'seeker@swiftpg.demo' && password === 'Seeker@123')

    if (isDemo) {
      console.log('Demo credentials used, bypassing Supabase and using local mock login.')
      const mock = getDemoMockData(email)
      
      // Save demo session details with login timestamp
      const demoSessionData = {
        user: mock.user,
        profile: mock.profile,
        session: mock.session,
        loginTime: Date.now()
      }
      localStorage.setItem('demo_session', JSON.stringify(demoSessionData))
      localStorage.setItem('last_active_time', String(Date.now()))

      if (mounted.current) {
        setUser(mock.user)
        setProfile(mock.profile)
        setSession(mock.session)
      }
      return { error: null, profile: mock.profile }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { error: error as Error | null, profile: null }
      }
      if (!data.user) {
        return { error: new Error('User not found') as Error | null, profile: null }
      }
      localStorage.setItem('last_active_time', String(Date.now()))
      const p = await fetchProfile(data.user.id)
      return { error: null, profile: p }
    } catch (e: any) {
      return { error: e as Error | null, profile: null }
    }
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    localStorage.removeItem('demo_session')
    localStorage.removeItem('last_active_time')
    await supabase.auth.signOut()
  }

  // ── register ───────────────────────────────────────────────────────────────
  async function register({
    email,
    password,
    fullName,
    role,
    phone,
  }: RegisterOptions): Promise<{ error: Error | null }> {
    const isDemo = false
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      })
      if (error) {
        if (isDemo) {
          console.warn('Demo signup failed, bypassing for local fallback:', error.message)
          return { error: null }
        }
        return { error: error as Error | null }
      }

      // Persist phone on the auto-created profile row
      if (phone && data.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any)
          .update({ phone })
          .eq('id', data.user.id)
      }
      return { error: null }
    } catch (e: any) {
      if (isDemo) {
        return { error: null }
      }
      return { error: e as Error | null }
    }
  }

  // ── legacy aliases ─────────────────────────────────────────────────────────
  async function signIn(email: string, password: string) {
    const { error } = await login(email, password)
    return { error }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: string,
    phone?: string
  ) {
    return register({ email, password, fullName, role, phone })
  }

  async function signOut() {
    return logout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isLoading: loading,
        profileLoading,
        login,
        logout,
        register,
        updateProfile,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
