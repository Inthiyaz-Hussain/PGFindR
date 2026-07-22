import { useState } from 'react'
import { Percent, History, Save, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseUntyped } from '@/lib/supabase'
import { toast } from 'sonner'

interface CommissionHistory {
  id: string
  old_rate: number
  new_rate: number
  reason: string | null
  created_at: string
  changed_by: { full_name: string } | null
}

export function AdminCommissionPage() {
  const queryClient = useQueryClient()
  const [newRate, setNewRate] = useState('')
  const [reason, setReason] = useState('')

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('platform_settings')
        .select('*')
        .eq('key', 'default_commission_rate')
        .single()
      return data as { id: string; value: string; updated_at: string } | null
    },
  })

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['commission-history'],
    queryFn: async () => {
      const { data } = await supabaseUntyped
        .from('commission_history')
        .select('*, changed_by:profiles!commission_history_changed_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(20)
      return (data || []) as CommissionHistory[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ rate, reasonText }: { rate: number; reasonText: string }) => {
      const currentRate = parseFloat(settings?.value || '10')

      // Get current user
      const { data: { user } } = await supabaseUntyped.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update settings
      const { error: settingsError } = await supabaseUntyped
        .from('platform_settings')
        .update({
          value: rate.toString(),
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'default_commission_rate')

      if (settingsError) throw settingsError

      // Log to history
      const { error: historyError } = await supabaseUntyped
        .from('commission_history')
        .insert({
          old_rate: currentRate,
          new_rate: rate,
          reason: reasonText || null,
          changed_by: user.id
        })

      if (historyError) throw historyError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
      queryClient.invalidateQueries({ queryKey: ['commission-history'] })
      toast.success('Commission rate updated')
      setNewRate('')
      setReason('')
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to update commission rate')
    },
  })

  const currentRate = parseFloat(settings?.value || '10')

  const handleSave = () => {
    const rate = parseFloat(newRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Please enter a valid percentage between 0 and 100')
      return
    }
    if (rate === currentRate) {
      toast.error('New rate cannot be the same as current rate')
      return
    }
    updateMutation.mutate({ rate, reasonText: reason })
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">Commission Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform-wide commission rates</p>
      </div>

      <div className="grid gap-6">
        {/* Current Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Default Commission Rate</CardTitle>
            </div>
            <CardDescription>
              This is the default commission applied to all new PG listings. Individual PGs can have custom rates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-primary">{currentRate}</span>
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Platform Fee
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  Last updated: {settings?.updated_at
                    ? new Date(settings.updated_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Never'}
                </p>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-rate">New Commission Rate (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        placeholder="e.g., 12.5"
                        className="max-w-[150px]"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Change (optional)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Market adjustment, seasonal promotion..."
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={!newRate || updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <><Loader2 className="size-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="size-4" /> Save Changes</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-5">
            <div className="flex gap-3">
              <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How commission works</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>When a booking is made, the platform deducts this percentage from the payment</li>
                  <li>The remaining amount is paid out to the PG owner</li>
                  <li>Changing this rate only affects new PG listings created after the change</li>
                  <li>Existing PGs keep their current commission rate</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Commission Change History</CardTitle>
            </div>
            <CardDescription>
              Log of all commission rate changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : history && history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Old Rate</TableHead>
                    <TableHead>New Rate</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm">
                        {new Date(h.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {h.changed_by?.full_name || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{h.old_rate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary">{h.new_rate}%</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No commission changes recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
