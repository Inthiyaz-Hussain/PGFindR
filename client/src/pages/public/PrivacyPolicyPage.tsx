import { Shield, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PrivacyPolicyPage() {
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
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <Shield className="size-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Effective Date: August 17, 2026. Your privacy and data security are our highest priorities.
          </p>
        </div>

        {/* Content Card with Glassmorphism */}
        <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">1</span>
              Information We Collect
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                We collect personal information to provide safe PG and room discovery services. The data collected includes:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Identity Details:</strong> Full name, date of birth, gender, and government-issued ID proof (Aadhaar, Passport, or PAN card) for KYC verification.</li>
                <li><strong>Contact Information:</strong> Email address, mobile phone number, and physical mailing addresses.</li>
                <li><strong>Financial Information:</strong> Bank details, transaction reference numbers, and billing history. Payment processing is handled by Cashfree Payments; we do not store raw card credentials or passwords on our servers.</li>
                <li><strong>Device Data:</strong> IP addresses, browser version, device identifiers, and site usage statistics.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">2</span>
              How We Use Your Data
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                We utilize your personal information for the following specific purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Facilitating PG search, booking, and room/bed reservations.</li>
                <li>Verifying user identities (KYC) to maintain safety across PGs.</li>
                <li>Processing transactions and generating invoices for monthly rent.</li>
                <li>Sending platform notifications, security alerts, and system confirmations.</li>
                <li>Complying with statutory tax and regulatory rules in India.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">3</span>
              Data Protection & Security
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-3">
              <p>
                We implement state-of-the-art security checks to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Encryption:</strong> All network traffic is encrypted using TLS (HTTPS). Sensitive files like tenant identity documents are stored in secure bucket stores with access controls.</li>
                <li><strong>Authentication Secrets:</strong> User JWT session credentials are stored inside short-lived, encrypted, `httpOnly` secure cookies to prevent cross-site scripting (XSS) leaks.</li>
                <li><strong>Payment Safety:</strong> Payment operations are strictly integrated via Cashfree Payment Gateway APIs, fully complying with PCI-DSS criteria.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center size-8 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-semibold border border-indigo-500/20">4</span>
              Data Sharing & Disclosures
            </h2>
            <p className="text-slate-300 leading-relaxed">
              We do not sell, rent, or lease your personal information. To complete bookings, your contact information, name, and ID proof are shared securely with the respective PG Owner of the booked property. We also disclose information when required by Indian law enforcement or regulatory authorities.
            </p>
          </section>

          <section className="pt-6 border-t border-slate-800/80 space-y-3">
            <h3 className="text-lg font-bold text-white">Privacy Support & Grievance</h3>
            <p className="text-sm text-slate-400">
              For any queries, corrections, or data removal requests, please contact our support team at:
            </p>
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
