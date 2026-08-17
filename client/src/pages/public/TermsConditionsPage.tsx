import { FileText, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors duration-200 mb-8 font-medium group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Hero Header */}
        <div className="text-center mb-16">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
            <FileText className="size-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Terms & Conditions
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Last Updated: August 17, 2026. Please read these terms carefully before using the FindPgR platform.
          </p>
        </div>

        {/* Content Card with Glassmorphism */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">1</span>
              About FindPgR Services
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                <strong>FindPgR</strong> is an online Paying Guest (PG) and coliving accommodation discovery, booking, and management platform. We connect prospective tenants (Seekers) looking for shared or private rooms with property owners (Owners) listing their PG accommodations.
              </p>
              <p>
                Through our platform, Seekers can search, filter, and view detailed PG listing specifications, floor layouts, amenities, and pricing. Booking reservations, initial security deposits, and subsequent monthly rent collections can be initiated and processed online securely through our integrated payment gateways.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">2</span>
              User Accounts & Verification
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                To access bookings and listing panels, users must register an account. You agree to provide accurate, current, and complete details during registration. 
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Seekers:</strong> Required to verify contact details and submit legitimate government-issued identity proof (KYC documents) when requested by Owners for verification prior to move-in.</li>
                <li><strong>Owners:</strong> Must submit business/personal KYC documentation and proof of property ownership or authorization before listing their PGs. Administrative approval is required to activate owner accounts.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">3</span>
              Booking, Payments, & Security Deposits
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                All online payments on FindPgR (such as booking fees, security deposits, and monthly rent) are powered by our payment gateway partner, Cashfree Payments.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Reservation & Disbursal:</strong> When booking a bed, the Seeker pays the booking/deposit fee. These funds are held securely by FindPgR and disbursed to the respective Owner only upon successful confirmation of move-in.</li>
                <li><strong>Rent Dues:</strong> Owners can generate monthly rent invoices. Tenants must settle these invoices before their specified due dates.</li>
                <li><strong>Direct Walk-Ins:</strong> Owners can log offline walk-in bookings. These transactions are mapped strictly to the system's live bed availability.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">4</span>
              Safety, Site Visits & Disclaimers
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                While we conduct strict verification of Owner profiles and KYC document collection, FindPgR acts as an intermediary discovery portal.
              </p>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 flex gap-3 text-sm">
                <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                <p>
                  <strong>Site Visit Recommendation:</strong> Seekers are strongly advised to physically visit the PG premises, inspect the rooms/beds, verify safety standards, and check landlord licenses before initiating final move-in confirmations or signing long-term lease agreements.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">5</span>
              Governing Law
            </h2>
            <p className="text-slate-300 leading-relaxed">
              These Terms and Conditions shall be governed by, and construed in accordance with, the laws of India. Any legal disputes arising out of the use of our services shall be subject to the exclusive jurisdiction of the courts located in Hyderabad, Telangana.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-800/80 space-y-3">
            <h3 className="text-lg font-bold text-white">Contact & Support</h3>
            <p className="text-sm text-slate-400">
              If you have any questions regarding these Terms, please contact our support team at:
            </p>
            <div className="text-sm text-slate-300 space-y-1">
              <p><strong>Email:</strong> support@findpgr.com</p>
              <p><strong>Support Helpline:</strong> +91 98765 43210</p>
              <p><strong>Corporate Address:</strong> FindPgR Coliving Spaces Pvt. Ltd., Madhapur, Hyderabad, Telangana, 500081.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
