import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Search, RefreshCw, User, ShieldCheck, CreditCard, Building, Info, FileText } from 'lucide-react'

interface AuditLog {
  action: string
  category: 'User' | 'Booking' | 'PG Listing' | 'Financial' | 'System'
  details: string
  user: string
  timestamp: string
}

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    action: 'Platform initialized',
    category: 'System',
    details: 'System startup successful. Database connections verified.',
    user: 'System Core',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000 * 5).toISOString(), // 5 days ago
  },
  {
    action: 'New PG Listing registered',
    category: 'PG Listing',
    details: 'Starlight Premium Coliving listed for approval.',
    user: 'Rajesh Sharma (Owner)',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000 * 3).toISOString(), // 3 days ago
  },
  {
    action: 'Owner KYC Submitted',
    category: 'User',
    details: 'PAN Card and bank credentials submitted for review.',
    user: 'Rajesh Sharma (Owner)',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000 * 2).toISOString(), // 2 days ago
  },
  {
    action: 'Commission parameters updated',
    category: 'System',
    details: 'Platform commission set to default 10.00%.',
    user: 'Super Admin',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000 * 1).toISOString(), // 1 day ago
  },
]

const CATEGORY_CONFIG = {
  User: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400', icon: User },
  Booking: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400', icon: ShieldCheck },
  'PG Listing': { color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400', icon: Building },
  Financial: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400', icon: CreditCard },
  System: { color: 'bg-slate-100 text-slate-800 dark:bg-slate-950/20 dark:text-slate-400', icon: FileText },
}

export function AdminAuditLogsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)

  // Load and merge logs from localStorage
  const fetchLogs = () => {
    setLoading(true)
    setTimeout(() => {
      const savedLogs = JSON.parse(localStorage.getItem('demo_audit_logs') || '[]') as AuditLog[]
      const merged = [...savedLogs, ...DEFAULT_AUDIT_LOGS]
      
      // Sort by timestamp descending
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      setLogs(merged)
      setLoading(false)
    }, 400)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="size-8 text-indigo-600 animate-pulse" /> System Audit Logs
          </h1>
          <p className="text-muted-foreground">Trace administrative logs, profile security updates, and transaction lifecycles.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="shrink-0 self-start sm:self-auto">
          <RefreshCw className={cn("size-4 mr-1.5", loading && "animate-spin")} /> Refresh Logs
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
        <CardContent className="pt-5 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search by action, details, user..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'User', 'Booking', 'PG Listing', 'Financial', 'System'].map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All Logs' : cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Layout */}
      <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
              <RefreshCw className="size-6 animate-spin text-slate-400" />
              <span>Fetching audit timeline...</span>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="relative border-l border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
              {filteredLogs.map((log, idx) => {
                const cfg = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.System
                const Icon = cfg.icon
                return (
                  <div key={idx} className="relative">
                    {/* Circle Pin Icon */}
                    <span className="absolute -left-10 top-0.5 flex size-8 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm ring-4 ring-white dark:ring-slate-950">
                      <Icon className="size-4 text-indigo-600" />
                    </span>

                    {/* Log Details */}
                    <div className="space-y-1.5 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {log.action}
                          <Badge className={cn("text-[10px] uppercase font-bold", cfg.color)} variant="outline">
                            {log.category}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{log.details}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="font-bold">Actor:</span>
                        <span>{log.user}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <Info className="size-6 text-slate-400" />
              <div className="font-semibold">No audit logs found</div>
              <div className="text-xs text-muted-foreground">Adjust your filters or search keywords.</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
