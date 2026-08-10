import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ShieldCheck, Receipt, HelpCircle, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'safety', label: 'Safety Guidelines', icon: ShieldCheck },
  { id: 'refund', label: 'Refund Policies', icon: Receipt },
  { id: 'faqs', label: 'FAQs & Guidelines', icon: HelpCircle },
  { id: 'privacy', label: 'Privacy & Terms', icon: FileText },
]

export function HelpDeskPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'safety'

  function setTab(tabId: string) {
    setSearchParams({ tab: tabId })
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-1.5 mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Seeker Help Desk</h1>
        <p className="text-muted-foreground">Find answers to safety protocols, billing queries, and booking terms.</p>
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
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none font-semibold scale-[1.02]"
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
          {activeTab === 'safety' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="size-5 text-indigo-600" /> Safety Guidelines
                </CardTitle>
                <CardDescription>Follow these best practices to ensure a secure and pleasant stay.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl p-4 text-amber-800 dark:text-amber-300 text-sm">
                  <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Verify Before You Book:</span> Always contact the host using the official inquiry form and confirm listing details prior to sending deposits outside the platform.
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Verified Listings</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    PGFindR verifies hosts and key PG photos. Verified PGs display a <span className="text-green-600 font-semibold">Verified badge</span>. We advise choosing verified listings to guarantee room descriptions match reality.
                  </p>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">2. Safe Payment Protocols</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground pl-4 list-disc">
                    <li>Pay booking and security deposits exclusively via the secure PGFindR Checkout.</li>
                    <li>Do not agree to wire cash or transfer directly unless you have visited the premises in person.</li>
                    <li>Always request a digitally signed receipt or written confirmation for any token amounts paid to PG staff.</li>
                  </ul>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Property Inspection Checkpoints</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upon checking in, verify the following details before signing final house agreements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {[
                      'Inspect fire safety protocols & fire extinguishers',
                      'Check CCTV cameras operational in corridors',
                      'Confirm locks on doors & secure cupboard locker keys',
                      'Verify water pressure & Geyser/heater operations'
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 text-xs">
                        <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'refund' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="size-5 text-indigo-600" /> Refund Policies
                </CardTitle>
                <CardDescription>Understand how cancellation fees, deposits, and payouts are managed.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Booking Fees Cancellation Window</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30">
                        <div className="font-semibold text-green-800 dark:text-green-400 mb-1">Up to 7 Days Prior</div>
                        <div className="text-green-700 dark:text-green-500">100% Refund of booking fee (excl. platform convenience fee).</div>
                      </div>
                      <div className="p-3 border rounded-lg bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/30">
                        <div className="font-semibold text-yellow-800 dark:text-yellow-400 mb-1">48 Hours to 7 Days</div>
                        <div className="text-yellow-700 dark:text-yellow-500">50% Refund. Standard platform cancellation charges apply.</div>
                      </div>
                      <div className="p-3 border rounded-lg bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30">
                        <div className="font-semibold text-red-800 dark:text-red-400 mb-1">Within 48 Hours</div>
                        <div className="text-red-700 dark:text-red-500">No Refund. Booking token is forwarded to host as hold fee.</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">Security Deposit Payout Rules</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your security deposit is paid directly to the host / landlord at check-in. The return of the deposit at checkout is governed by the signed tenancy agreement:
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground pl-4 list-disc">
                    <li><span className="font-semibold text-slate-800 dark:text-slate-200">Notice Period:</span> Landlords usually require a 30-day notice period before check-out to refund full deposits.</li>
                    <li><span className="font-semibold text-slate-800 dark:text-slate-200">Damage Deductions:</span> Painting or damage cleaning charges are standard and should not exceed 10-15% of the security deposit. Any extra deductions must be supported by bills.</li>
                    <li><span className="font-semibold text-slate-800 dark:text-slate-200">Dispute Escalation:</span> If a host refuses to pay back your deposit unjustifiably, you can raise an escalation to PGFindR Customer Care with copy of notices and receipts.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'faqs' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <HelpCircle className="size-5 text-indigo-600" /> FAQs & Guidelines
                </CardTitle>
                <CardDescription>Frequently asked questions from tenants and seekers.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {[
                    { q: "How do I schedule a physical PG visit?", a: "Find the PG details page, fill out the inquiry form with your contact number and preferred date, and hit submit. The PG owner will receive a notification and contact you to coordinate." },
                    { q: "What documents are required to check into a PG?", a: "You generally need one Government-issued photo ID (Aadhaar Card, Passport, or PAN) along with a colored passport photo. Some PGs also require employment verification or college ID." },
                    { q: "What is included in the food facility?", a: "It varies by PG listing. Many provide breakfast and dinner on weekdays, and three meals on weekends. Toggles on the PG page will specify if food, AC, and laundry are included in the base rent." },
                    { q: "Are lock-in periods mandatory?", a: "Standard PGs have a 1 to 3 months lock-in period. Leaving before the lock-in period results in forfeiture of the security deposit." }
                  ].map((faq, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="border-slate-100 dark:border-slate-800/80">
                      <AccordionTrigger className="text-sm font-semibold hover:text-indigo-600 transition-colors text-left">{faq.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-slate-500 leading-relaxed">{faq.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="size-5 text-indigo-600" /> Privacy Policy & Terms of Service
                </CardTitle>
                <CardDescription>Legal framework and safety disclosures for using FindPgR.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                
                {/* Privacy Policy Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-800">
                    Privacy Policy for FindPgR
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">Last Updated: August 10, 2026</p>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    At <strong>FindPgR</strong> ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our coliving and paying guest (PG) discovery platform.
                  </p>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Information We Collect</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      We collect information that identifies, relates to, or could reasonably be linked to you ("Personal Data"), including:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li><strong>Account Information:</strong> Name, email address, and profile picture obtained via third-party authentication services (e.g., Google OAuth).</li>
                      <li><strong>Identity & Verification Data (KYC):</strong> For property owners, we collect government-issued identification numbers, copies of ID documents, and property ownership proofs (such as utility bills) for verification purposes.</li>
                      <li><strong>Location Data:</strong> Approximate or precise location data when you use our geo-search features to find nearby PGs.</li>
                      <li><strong>Usage & Device Data:</strong> IP address, browser type, device identifiers, and interaction logs with our platform.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. How We Use Your Information</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      We use the collected information for the following purposes:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>To provide, operate, and maintain the FindPgR platform and real-time bed availability features.</li>
                      <li>To authenticate user accounts and secure platform access.</li>
                      <li>To execute our owner verification (KYC) process and maintain the integrity of "Verified" listings.</li>
                      <li>To communicate with you regarding bookings, inquiries, and customer support.</li>
                      <li>To detect, prevent, and address technical issues, fraud, or security breaches.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Data Storage & Security</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Your personal data and sensitive documents are stored securely using cloud infrastructure (Supabase) featuring industry-standard encryption and strict Row Level Security (RLS) policies. KYC verification documents are kept confidential and are strictly accessible only by authorized platform administrators.
                    </p>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Sharing of Information</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      We do not sell, trade, or rent your personal information to third parties. We may share data only under these circumstances:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>With trusted service providers who assist us in operating our website and conducting our business, subject to strict confidentiality obligations.</li>
                      <li>To comply with legal obligations, court orders, or lawful requests by public authorities.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Your Data Rights</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      You have the right to access, update, or request the deletion of your personal data stored on our platform by contacting our support team.
                    </p>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Changes to This Privacy Policy</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
                    </p>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Terms and Conditions Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-800">
                    Terms & Conditions for FindPgR
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">Last Updated: August 10, 2026</p>

                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Welcome to <strong>FindPgR</strong>. These Terms and Conditions ("Terms") govern your access to and use of our website, applications, and services. By accessing or using FindPgR, you agree to be bound by these Terms.
                  </p>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      By creating an account, browsing listings, or listing a property on FindPgR, you acknowledge that you have read, understood, and agree to comply with these Terms and our Privacy Policy. If you do not agree, you must discontinue use of the platform immediately.
                    </p>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">2. User Accounts & Security</h3>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>You are responsible for maintaining the confidentiality of your account credentials, including sign-ins via Google OAuth.</li>
                      <li>You agree to provide accurate, current, and complete information during registration and property listing processes.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">3. Platform Role & Disclaimer</h3>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>FindPgR acts purely as an online aggregator and discovery platform connecting accommodation seekers with property owners/managers.</li>
                      <li>We do not directly own, manage, or operate the listed paying guest (PG) accommodations unless explicitly stated.</li>
                      <li>While we implement KYC verification workflows for owners to foster trust, users are strongly advised to independently inspect properties and verify terms before making payments or signing agreements.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">4. Property Owner Responsibilities & KYC</h3>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>Property owners listing spaces on FindPgR warrant that they possess legal authorization to lease the property.</li>
                      <li>Owners agree to submit authentic KYC documentation and property proofs. Submission of fraudulent documents will result in immediate account termination, removal of listings, and potential legal action.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">5. Prohibited Conduct</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Users agree not to engage in any of the following prohibited activities:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <li>Uploading malicious code, viruses, or attempting to breach platform security or RLS policies.</li>
                      <li>Scraping, harvesting, or extracting data from the platform via automated means without explicit written permission.</li>
                      <li>Posting false, misleading, or fraudulent property listings or reviews.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">6. Limitation of Liability</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      To the maximum extent permitted by law, FindPgR and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or personal disputes arising out of or related to your use of the platform or tenancy agreements.
                    </p>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">7. Governing Law</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.
                    </p>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">8. Contact Information</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      For any questions regarding these Terms, please reach out through our official platform support channels.
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
