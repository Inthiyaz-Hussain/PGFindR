import { Link } from 'react-router-dom'
import {
  Building2,
  ShieldCheck,
  ArrowUp
} from 'lucide-react'

const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const Twitter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

export interface FooterProps {
  compact?: boolean
}

export function Footer({ compact = false }: FooterProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  const pathname = window.location.pathname
  const role = (
    pathname.startsWith('/admin') ? 'admin' :
    pathname.startsWith('/owner') ? 'owner' :
    pathname.startsWith('/seeker') ? 'seeker' :
    'public'
  )

  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${compact ? 'py-6' : 'py-12'}`}>
        {!compact && (
          <>
            {/* Main 4-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Column 1: Brand Profile */}
              <div className="space-y-4">
                <Link to="/" className="flex items-center gap-2 group max-w-fit">
                  <img
                    src="/logo-swiftpg.png"
                    alt="SwiftPG Icon"
                    className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-800 shadow-xs group-hover:scale-105 transition-transform"
                  />
                  <span className="text-xl font-bold tracking-tight text-white">
                    Swift<span className="text-indigo-400 font-extrabold">PG</span>
                  </span>
                </Link>
                <p className="text-sm text-slate-400 leading-relaxed pr-4">
                  Your verified home away from home, zero brokerage hassle. Find and book premium coliving spaces instantly.
                </p>
                {/* Social Links */}
                <div className="flex items-center gap-3">
                  {[
                    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
                    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
                    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
                    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
                  ].map((social, index) => {
                    const Icon = social.icon
                    return (
                      <a
                        key={index}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-800/50 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-500 transition-all duration-200"
                        aria-label={social.label}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* Column 2: Popular Cities or Dashboard Overview */}
              {role === 'seeker' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 font-bold text-indigo-400">
                    Seeker Dashboard
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'Overview Dashboard', to: '/seeker' },
                      { label: 'My Inquiries', to: '/seeker/inquiries' },
                      { label: 'My Bookings', to: '/seeker/bookings' },
                      { label: 'Profile Settings', to: '/seeker/profile' },
                    ].map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                          <span>•</span> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'owner' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 font-bold text-indigo-400">
                    Owner Portal
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'Dashboard Overview', to: '/owner' },
                      { label: 'Manage PGs', to: '/owner/pgs' },
                      { label: 'Tenant Inquiries', to: '/owner/inquiries' },
                      { label: 'Earnings & Payouts', to: '/owner/earnings' },
                      { label: 'KYC & Verification', to: '/owner/kyc' },
                    ].map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                          <span>•</span> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'admin' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4 font-bold text-indigo-400">
                    Admin Console
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'Admin Overview', to: '/admin' },
                      { label: 'Approve PG Listings', to: '/admin/pgs' },
                      { label: 'Manage Owners', to: '/admin/owners' },
                      { label: 'Manage Seekers', to: '/admin/users' },
                    ].map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                          <span>•</span> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'public' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                    Popular Cities
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      'Bangalore',
                      'Mumbai',
                      'Hyderabad',
                      'Pune',
                      'Chennai',
                      'Delhi',
                      'Noida',
                      'Gurgaon',
                    ].map((city) => (
                      <li key={city}>
                        <Link
                          to={`/search?q=${city}`}
                          className="hover:text-white transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <span>•</span> {city}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Column 3: Quick Links / Custom Help Links */}
              {role === 'seeker' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                    Seeker Help Desk
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'Safety Guidelines', to: '/' },
                      { label: 'Refund Policies', to: '/' },
                      { label: 'FAQs & Guidelines', to: '/' },
                      { label: 'Privacy & Terms', to: '/' },
                    ].map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                          <span>•</span> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'owner' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                    Owner Resources
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'Listing Guide', to: '/' },
                      { label: 'Pricing Calculator', to: '/' },
                      { label: 'Rental Agreements', to: '/' },
                      { label: 'Tax Statements', to: '/' },
                    ].map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                          <span>•</span> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'admin' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                    System Controls
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'Commission Settings', to: '/admin/commission' },
                      { label: 'Transaction Ledger', to: '/admin/transactions' },
                      { label: 'Platform Settings', to: '/' },
                      { label: 'Audit Logs', to: '/' },
                    ].map((item) => (
                      <li key={item.label}>
                        <Link to={item.to} className="hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                          <span>•</span> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === 'public' && (
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                    Quick Links
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { label: 'About Us', to: '/' },
                      { label: 'Careers', to: '/' },
                      { label: 'Terms & Conditions', to: '/' },
                      { label: 'Privacy Policy', to: '/' },
                      { label: 'Support & Help', to: '/' },
                    ].map((link, idx) => (
                      <li key={idx}>
                        <Link
                          to={link.to}
                          className="hover:text-white transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <span>•</span> {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Column 4: Contextual Actions / CTA Card */}
              {(role === 'seeker' || role === 'public') && (
                <div>
                  <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800/80 p-5 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Building2 className="h-5 w-5" />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Customer Care</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Need assistance with finding a PG, booking confirmation, or payments? Contact our dedicated admin support desk.
                    </p>
                    <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Helpline:</span>
                        <span className="font-semibold text-indigo-450">+91 800-555-0199</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-semibold hover:text-white transition-colors">support@swiftpg.com</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Available:</span>
                        <span className="font-semibold text-emerald-450">24/7 (Mon - Sun)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {role === 'owner' && (
                <div>
                  <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800/80 p-5 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Building2 className="h-5 w-5" />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Owner Support</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Need assistance with your PG listings, payouts, or KYC verification? Contact our dedicated support desk.
                    </p>
                    <Link
                      to="/owner/kyc"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95 duration-150 text-center"
                    >
                      Complete KYC
                    </Link>
                  </div>
                </div>
              )}

              {role === 'admin' && (
                <div>
                  <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800/80 p-5 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">System Health</span>
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs text-slate-300 font-medium">All systems fully operational</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      If there are server alerts or pending approval backlogs, check notifications or system logs immediately.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-800 mb-6" />
          </>
        )}

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            &copy; {new Date().getFullYear()} SwiftPG. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-slate-800/40 border border-slate-800/60 text-slate-500 text-[11px] font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>100% Verified Listings &amp; Secure Browsing</span>
          </div>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white hover:underline cursor-pointer group"
          >
            <span>Back to Top</span>
            <ArrowUp className="h-3.5 w-3.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  )
}
