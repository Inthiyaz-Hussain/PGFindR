import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { supabaseUntyped } from '@/lib/supabase'
import { Settings, Save, Loader2, CheckCircle2, History, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PlatformSettingRow {
  id?: string
  key: string
  value: string
  description?: string
  updated_at?: string
}

export function AdminPlatformSettingsPage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const isDemo = user?.id === '00000000-0000-0000-0000-000000000003'

  const [form, setForm] = useState({
    commissionRate: '1.00',
    depositMonths: '2',
    supportPhone: '+91 6302854691',
    supportEmail: 'inthiyazhussain69@gmail.com',
    manualApproval: true,
    maintenanceMode: false,
    platformFee: '300.00',
    serviceCharge: '0.00',
  })

  // Query Settings
  useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: async () => {
      if (isDemo) {
        const saved = localStorage.getItem('demo_platform_settings')
        if (saved) {
          const parsed = JSON.parse(saved)
          setForm(parsed)
          return parsed
        }
        return null
      }

      const { data, error } = await supabaseUntyped
        .from('platform_settings')
        .select('*')
      if (error) throw error
      
      const settingsMap = (data || []).reduce((acc: Record<string, string>, item: PlatformSettingRow) => {
        acc[item.key] = item.value
        return acc
      }, {})

      const initialForm = {
        commissionRate: settingsMap['commission_rate'] || '1.00',
        depositMonths: settingsMap['default_safety_deposit_multiplier'] || '2',
        supportPhone: settingsMap['help_desk_phone'] || '+91 6302854691',
        supportEmail: settingsMap['help_desk_email'] || 'inthiyazhussain69@gmail.com',
        manualApproval: settingsMap['manual_pg_approval'] === 'true',
        maintenanceMode: settingsMap['platform_maintenance_mode'] === 'true',
        platformFee: settingsMap['platform_fee'] || '300.00',
        serviceCharge: settingsMap['service_charge'] || '0.00',
      }

      setForm(initialForm)
      return data
    }
  })

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        localStorage.setItem('demo_platform_settings', JSON.stringify(form))
        // Log an audit log action in local storage too!
        const logs = JSON.parse(localStorage.getItem('demo_audit_logs') || '[]')
        logs.unshift({
          action: 'Platform settings updated',
          category: 'System',
          details: 'Commission, support channels, fees, and approval policies updated.',
          user: profile?.full_name || 'System Admin',
          timestamp: new Date().toISOString()
        })
        localStorage.setItem('demo_audit_logs', JSON.stringify(logs))
        return
      }

      const updates = [
        { key: 'commission_rate', value: form.commissionRate, description: 'Default platform commission percentage' },
        { key: 'default_safety_deposit_multiplier', value: form.depositMonths, description: 'Standard security deposit months' },
        { key: 'help_desk_phone', value: form.supportPhone, description: 'Customer support hotline phone number' },
        { key: 'help_desk_email', value: form.supportEmail, description: 'Customer support contact email address' },
        { key: 'manual_pg_approval', value: form.manualApproval.toString(), description: 'Toggle for manual PG verification gate' },
        { key: 'platform_maintenance_mode', value: form.maintenanceMode.toString(), description: 'Toggle to lock platform for upgrades' },
        { key: 'platform_fee', value: form.platformFee, description: 'Flat platform fee charged to seekers' },
        { key: 'service_charge', value: form.serviceCharge, description: 'Flat service charge charged to seekers' },
      ]

      for (const item of updates) {
        const { error } = await supabaseUntyped
          .from('platform_settings')
          .upsert(item, { onConflict: 'key' })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-settings'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats-full'] })
      toast.success('Platform configurations saved successfully')
    },
    onError: () => toast.error('Failed to save settings')
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="size-8 text-indigo-600" /> Platform Configurations
        </h1>
        <p className="text-muted-foreground">Admin panel to configure platform fees, approvals, helpline details, and system toggles.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Controls */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Financial Settings</CardTitle>
              <CardDescription>Configure billing rates, payouts, and deposit multipliers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Default Commission Rate (%)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">%</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-7"
                      value={form.commissionRate}
                      onChange={(e) => setForm((p) => ({ ...p, commissionRate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Standard Security Deposit (Months)</Label>
                  <Input
                    type="number"
                    value={form.depositMonths}
                    onChange={(e) => setForm((p) => ({ ...p, depositMonths: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Seeker Payment Fees</CardTitle>
              <CardDescription>Configure platform fee and service charge billed to seekers during booking checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Platform Fee (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <Input
                      type="number"
                      step="1"
                      className="pl-7"
                      value={form.platformFee}
                      onChange={(e) => setForm((p) => ({ ...p, platformFee: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Service Charge (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                    <Input
                      type="number"
                      step="1"
                      className="pl-7"
                      value={form.serviceCharge}
                      onChange={(e) => setForm((p) => ({ ...p, serviceCharge: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Support Helpline Details</CardTitle>
              <CardDescription>Contact info rendered across seeker help desk and footers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Support Call Center Number</Label>
                  <Input
                    value={form.supportPhone}
                    onChange={(e) => setForm((p) => ({ ...p, supportPhone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Support Helpdesk Email</Label>
                  <Input
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Security & Approvals Gate</CardTitle>
              <CardDescription>Policy controls on listings availability and system maintenance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/30 dark:bg-slate-900/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Require Admin Listing Verification</Label>
                  <p className="text-xs text-muted-foreground">New PG listings must be reviewed and approved before going live.</p>
                </div>
                <Switch
                  checked={form.manualApproval}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, manualApproval: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/30 dark:bg-slate-900/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-destructive">Platform Maintenance Lock</Label>
                  <p className="text-xs text-muted-foreground">Places the website under maintenance mode. Restricts new bookings.</p>
                </div>
                <Switch
                  checked={form.maintenanceMode}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, maintenanceMode: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-100/60">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-2.5 text-indigo-700 dark:text-indigo-400">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">System Operations note</h4>
                  <p className="text-xs text-indigo-600/90 dark:text-indigo-500/90 leading-relaxed mt-1">
                    Updates to platform configurations take effect immediately. All pricing estimations and inquiry notifications run dynamically based on these variables.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md py-5"
              >
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
                Commit Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <History className="size-4" /> Change History
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <CheckCircle2 className="size-3.5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-300">TDS rules configured</div>
                  <div className="text-[10px] text-muted-foreground">Updated by system seeds</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <CheckCircle2 className="size-3.5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-300">Commission set to 10%</div>
                  <div className="text-[10px] text-muted-foreground">Updated by Rajesh Sharma (Seed)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
