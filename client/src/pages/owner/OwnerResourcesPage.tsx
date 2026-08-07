import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calculator, FileCheck, Receipt, Percent, FileText, CheckCircle2, Download, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'listing', label: 'Listing Guide', icon: BookOpen },
  { id: 'calculator', label: 'Pricing Calculator', icon: Calculator },
  { id: 'agreement', label: 'Rental Agreements', icon: FileCheck },
  { id: 'tax', label: 'Tax Statements', icon: Receipt },
]

export function OwnerResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'listing'

  function setTab(tabId: string) {
    setSearchParams({ tab: tabId })
  }

  // --- Pricing Calculator State ---
  const [baseRent, setBaseRent] = useState('8000')
  const [sharingType, setSharingType] = useState('2') // Double sharing
  const [includeFood, setIncludeFood] = useState(true)
  const [includeWifi, setIncludeWifi] = useState(true)
  const [includeAc, setIncludeAc] = useState(false)
  const [commissionRate, setCommissionRate] = useState(10) // 10% standard

  const calculatorResults = useMemo(() => {
    const rent = parseFloat(baseRent) || 0
    let modifier = 1
    // Sharing type modifiers
    if (sharingType === '1') modifier = 1.4 // Single room costs more
    if (sharingType === '2') modifier = 1.0
    if (sharingType === '3') modifier = 0.8
    if (sharingType === '4') modifier = 0.65

    let extraCharges = 0
    if (includeFood) extraCharges += 2500
    if (includeWifi) extraCharges += 300
    if (includeAc) extraCharges += 1500

    const rentPerBed = Math.round((rent * modifier) + extraCharges)
    const platformCommission = Math.round(rentPerBed * (commissionRate / 100))
    const hostPayout = rentPerBed - platformCommission
    const securityDeposit = rentPerBed * 2

    return {
      rentPerBed,
      platformCommission,
      hostPayout,
      securityDeposit
    }
  }, [baseRent, sharingType, includeFood, includeWifi, includeAc, commissionRate])

  // --- Agreement Generator State ---
  const [ownerName, setOwnerName] = useState('Rajesh Sharma')
  const [seekerName, setSeekerName] = useState('Arjun Mehta')
  const [pgName, setPgName] = useState('Starlight Premium Coliving')
  const [roomNum, setRoomNum] = useState('B-102')
  const [agreementRent, setAgreementRent] = useState('11000')
  const [agreementDeposit, setAgreementDeposit] = useState('22000')
  const [duration, setDuration] = useState('11')
  const [showAgreementPreview, setShowAgreementPreview] = useState(false)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Owner Resources</h1>
        <p className="text-muted-foreground">Manage your listing policies, generate rental lease agreements, and calculate payouts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-left border border-transparent",
                  isActive
                    ? "bg-amber-600 text-white shadow-md shadow-amber-100 dark:shadow-none font-semibold scale-[1.02]"
                    : "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800/60"
                )}
              >
                <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3">
          {activeTab === 'listing' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BookOpen className="size-5 text-amber-600" /> Listing Quality Guide
                </CardTitle>
                <CardDescription>Follow this checklist to optimize listing details and pass KYC validation quickly.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">How to Get Your PG Approved</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    PGFindR maintains a quality standard. Listings with high-quality descriptions and clear photos receive up to 5x higher seeker response rates.
                  </p>

                  <div className="space-y-3">
                    {[
                      { title: "Complete KYC Identity Verification", desc: "Submit your PAN, Aadhaar, and Bank payout details under 'KYC Verification' in your dashboard." },
                      { title: "Add Clean, Well-lit Photos", desc: "Upload at least 3 room photos, 1 bathroom photo, and 1 exterior entrance photo. Avoid blurry screenshots." },
                      { title: "Define Accurate Amenities", desc: "Specify AC facilities, WiFi, laundry availability, food timing, and security measures accurately." },
                      { title: "Specify Sharing Rates clearly", desc: "Enter correct monthly rates and daily rates for each bed configuration (Single, Double, Triple sharing)." },
                    ].map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                        <CheckCircle2 className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'calculator' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Calculator className="size-5 text-amber-600" /> Payout & Commission Calculator
                </CardTitle>
                <CardDescription>Estimate your monthly payout per bed and security deposit settings.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Base Rent (Single Room Rate Reference)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={baseRent}
                        onChange={(e) => setBaseRent(e.target.value)}
                        placeholder="8000"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bed Sharing Type</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800"
                      value={sharingType}
                      onChange={(e) => setSharingType(e.target.value)}
                    >
                      <option value="1">Private / Single Room</option>
                      <option value="2">2-Sharing Room (Double)</option>
                      <option value="3">3-Sharing Room (Triple)</option>
                      <option value="4">4-Sharing Room (Quadruple)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="block mb-1">Additional Amenities Provided</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includeFood}
                          onChange={(e) => setIncludeFood(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Include Food (Breakfast & Dinner) (+ ₹2,500/mo)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includeWifi}
                          onChange={(e) => setIncludeWifi(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        High-speed Wi-Fi (+ ₹300/mo)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includeAc}
                          onChange={(e) => setIncludeAc(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Air Conditioning (AC) (+ ₹1,500/mo)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Outputs Panel */}
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Seeker Rent (per bed)</div>
                      <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                        ₹{calculatorResults.rentPerBed.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-500"> / month</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Percent className="size-3" /> Platform Fee ({commissionRate}%)
                        </div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          ₹{calculatorResults.platformCommission.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Security Deposit (2 mo)</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          ₹{calculatorResults.securityDeposit.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Net Monthly Payout (Your Earnings)</div>
                      <div className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-0.5">
                        ₹{calculatorResults.hostPayout.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 border-green-200">90% Yield</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'agreement' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileCheck className="size-5 text-amber-600" /> Tenancy Rental Agreement Generator
                </CardTitle>
                <CardDescription>Quickly fill in client information to generate a standard PG rental lease deed.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {!showAgreementPreview ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Landlord / Owner Name</Label>
                      <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tenant / Seeker Name</Label>
                      <Input value={seekerName} onChange={(e) => setSeekerName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>PG Name</Label>
                      <Input value={pgName} onChange={(e) => setPgName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Room / Bed Number</Label>
                      <Input value={roomNum} onChange={(e) => setRoomNum(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Monthly Rent Amount (₹)</Label>
                      <Input type="number" value={agreementRent} onChange={(e) => setAgreementRent(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Security Deposit Amount (₹)</Label>
                      <Input type="number" value={agreementDeposit} onChange={(e) => setAgreementDeposit(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lease Duration (Months)</Label>
                      <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2 pt-2">
                      <Button onClick={() => setShowAgreementPreview(true)} className="w-full">
                        <FileText className="size-4 mr-2" /> Generate Agreement Draft
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="size-4 mr-1.5" /> Print Agreement
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAgreementPreview(false)}>
                        Back to Edit
                      </Button>
                    </div>

                    <div className="border border-slate-300 p-8 rounded-xl bg-white text-slate-800 text-sm font-serif shadow-inner max-h-[400px] overflow-y-auto leading-relaxed whitespace-pre-line">
                      <div className="text-center font-bold text-lg underline mb-6 uppercase">Hostel / PG Tenancy Lease Agreement</div>
                      
                      This Tenancy Agreement is made on this {new Date().toLocaleDateString('en-IN')} by and between:
                      
                      <span className="font-bold">LANDLORD (Host / Owner):</span> {ownerName}
                      <span className="font-bold">TENANT (Seeker):</span> {seekerName}
                      
                      WHEREAS the Landlord agrees to license/let and the Tenant agrees to take the accommodation described as room <span className="font-bold">{roomNum}</span> at <span className="font-bold">{pgName}</span> under the following terms:
                      
                      1. **Renting Term**: The tenancy shall be for a fixed duration of <span className="font-bold">{duration}</span> months starting from {new Date().toLocaleDateString('en-IN')}.
                      
                      2. **Monthly Rent**: The Tenant shall pay the Landlord a sum of <span className="font-bold">₹{parseFloat(agreementRent).toLocaleString('en-IN')}</span> per month as license fees. Payment must be cleared on or before the 5th of each calendar month.
                      
                      3. **Security Deposit**: The Tenant has paid a security deposit of <span className="font-bold">₹{parseFloat(agreementDeposit).toLocaleString('en-IN')}</span>. This deposit is interest-free and refundable at the time of checkout, subject to deductions for damages or notice defaults.
                      
                      4. **Notice Period**: Either party must provide 30 days prior notice before checking out or terminating this license deed.
                      
                      IN WITNESS WHEREOF the parties have set their signatures below:
                      
                      __________________                __________________
                      Landlord/Host Signature           Tenant/Seeker Signature
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'tax' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="size-5 text-amber-600" /> Payout & Tax Statements
                </CardTitle>
                <CardDescription>View annual TDS declarations and download income statements.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-900/20">
                    <div className="text-xs text-muted-foreground">Gross Receipts (FY 26-27)</div>
                    <div className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">₹1,32,000</div>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-900/20">
                    <div className="text-xs text-muted-foreground">TDS Deducted (1%)</div>
                    <div className="text-xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">₹1,320</div>
                  </div>
                  <div className="p-4 border rounded-xl bg-slate-50/20 dark:bg-slate-900/20">
                    <div className="text-xs text-muted-foreground">Net Bank Payouts</div>
                    <div className="text-xl font-extrabold text-green-600 dark:text-green-400 mt-1">₹1,30,680</div>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-muted-foreground font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-3">Quarter</th>
                        <th className="px-4 py-3">Gross Earnings</th>
                        <th className="px-4 py-3">TDS (Section 194-IB)</th>
                        <th className="px-4 py-3 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[
                        { q: 'Q1 (Apr - Jun)', gross: '₹33,000', tds: '₹330' },
                        { q: 'Q2 (Jul - Sep)', gross: '₹33,000', tds: '₹330' },
                        { q: 'Q3 (Oct - Dec)', gross: '₹33,000', tds: '₹330' },
                        { q: 'Q4 (Jan - Mar)', gross: '₹33,000', tds: '₹330' },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="px-4 py-3 font-medium">{row.q}</td>
                          <td className="px-4 py-3">{row.gross}</td>
                          <td className="px-4 py-3">{row.tds}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon-sm" className="text-amber-600 hover:text-amber-700">
                              <Download className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
