import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

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
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      const p = data as Profile | null
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

  useEffect(() => {
    // Restore session from localStorage (Supabase handles this automatically)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted.current) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

// Helper to construct mock session and profile for demo credentials when Supabase is unverified or errors out
function getDemoMockData(email: string) {
  const role = email.includes('admin') ? 'admin' : email.includes('owner') ? 'owner' : 'seeker'
  const id = role === 'admin' ? '00000000-0000-0000-0000-000000000003' : role === 'owner' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001'
  const full_name = role.charAt(0).toUpperCase() + role.slice(1) + ' Test User'
  
  const mockUser = {
    id,
    email,
    user_metadata: { full_name, role },
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any
  
  const mockProfile = {
    id,
    full_name,
    role,
    phone: '+91 9999999999',
    created_at: new Date().toISOString(),
  } as Profile
  
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
    const isDemo = false
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (isDemo) {
          console.warn('Demo login failed with Supabase, falling back to mock login:', error.message)
          const mock = getDemoMockData(email)
          if (mounted.current) {
            setUser(mock.user)
            setProfile(mock.profile)
            setSession(mock.session)
          }
          return { error: null, profile: mock.profile }
        }
        return { error: error as Error | null, profile: null }
      }
      if (!data.user) {
        return { error: new Error('User not found') as Error | null, profile: null }
      }
      const p = await fetchProfile(data.user.id)
      return { error: null, profile: p }
    } catch (e: any) {
      if (isDemo) {
        console.warn('Demo login caught exception, falling back to mock:', e.message)
        const mock = getDemoMockData(email)
        if (mounted.current) {
          setUser(mock.user)
          setProfile(mock.profile)
          setSession(mock.session)
        }
        return { error: null, profile: mock.profile }
      }
      return { error: e as Error | null, profile: null }
    }
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  async function logout() {
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
