import { RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function RefundPolicyPage() {
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
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-spin-slow animate-pulse">
            <RefreshCw className="size-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Refund & Cancellation Policy
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Last Updated: August 17, 2026. Clarity on booking cancellations, security deposits, and transaction refunds.
          </p>
        </div>

        {/* Content Card with Glassmorphism */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">1</span>
              Booking Cancellations & Fee Refund
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                Seekers can cancel a bed/room booking reservation directly through the FindPgR platform before confirmation of move-in.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Pre-Move-In Cancellation:</strong> If a booking is cancelled by the tenant at least 24 hours prior to the scheduled move-in date, a 100% refund of the security deposit will be processed.</li>
                <li><strong>Late Cancellation:</strong> Cancellations within 24 hours of the move-in date may be subject to a nominal cancellation fee (up to 10% of the deposit amount) to compensate the owner for inventory locking.</li>
                <li><strong>Disputed Bed/Room:</strong> If the seeker cancels due to a mismatch in room facilities or discrepancies during physical site inspection, the full booking deposit will be refunded unconditionally.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">2</span>
              Processing Time for Refunds
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                All online refunds are settled directly to the customer's original payment source (Credit/Debit Card, Netbanking, or UPI):
              </p>
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                <CheckCircle className="size-5 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">
                  <strong>Refund Processing Window:</strong> Approved refunds are auto-triggered to our payment gateway (Cashfree Payments) and generally clear into the seeker's original funding source within <strong>5 to 7 business days</strong>.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">3</span>
              Security Deposit Refunds Post Move-In
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Once a seeker checks in and confirms their move-in status, the booking deposit is disbursed to the PG Owner. Any subsequent security deposit refunds upon vacating the premises are governed directly by the rental agreement between the Tenant and the Owner. FindPgR does not hold or process security deposits after check-in has been confirmed.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">4</span>
              Chargebacks & Payment Disputes
            </h2>
            <p className="text-slate-300 leading-relaxed">
              For any duplicate charges, failed transaction checkouts where money was debited but room booking was not confirmed, or disputable card charges, please reach out to us at inthiyazhussain69@gmail.com before initiating chargebacks with your card-issuing bank. We resolve duplicate charge disputes within 24 hours.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-800/80 space-y-3">
            <h3 className="text-lg font-bold text-white">Refund Support</h3>
            <div className="text-sm text-slate-300 space-y-1">
              <p><strong>Email:</strong> inthiyazhussain69@gmail.com</p>
              <p><strong>Support Helpline:</strong> +91 6302854691</p>
              <p><strong>Corporate Address:</strong> Bangalore, 560068</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
