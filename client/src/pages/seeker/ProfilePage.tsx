import { useState, useEffect } from 'react'
import { User, Phone, Mail, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync state with profile or localStorage
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
      setEmail(user?.email || '')
    } else {
      setFullName(localStorage.getItem('seeker_fullName') || '')
      setPhone(localStorage.getItem('seeker_phone') || '')
      setEmail(localStorage.getItem('seeker_email') || '')
    }
  }, [profile, user])

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (user) {
      const { error } = await (supabase
        .from('profiles') as any)
        .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      setSaving(false)
      if (error) {
        toast.error('Failed to save profile')
      } else {
        await refreshProfile()
        toast.success('Profile updated!')
      }
    } else {
      localStorage.setItem('seeker_fullName', fullName)
      localStorage.setItem('seeker_phone', phone)
      localStorage.setItem('seeker_email', email)
      setSaving(false)
      toast.success('Profile saved locally!')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{fullName || 'Guest Seeker'}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">{profile?.role || 'Guest Seeker'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!user}
                  className={`pl-10 ${user ? 'bg-muted' : ''}`}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
