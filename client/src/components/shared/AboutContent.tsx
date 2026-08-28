import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Headphones,
  MapPin,
  CheckCircle2,
  Lock,
  Zap,
  Award,
  Users,
  Cpu,
  Globe,
  Building,
  Smile,
  Map,
  Star,
  Phone,
  Mail,
  Compass,
  Eye,
  History
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function AboutContent() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-20 animate-in fade-in duration-500">
      
      {/* Hero Header */}
      <section className="relative text-center space-y-6 overflow-hidden rounded-3xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 py-20 px-6 shadow-2xl border border-indigo-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]" />
        
        <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
          <Badge className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            ✨ Redefining CO-LIVING
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            We Started With a <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Simple Mission</span>
          </h1>
          <p className="text-lg sm:text-xl text-indigo-200/80 leading-relaxed font-light">
            FindPG was born with a clear and simple vision: to make the process of finding a PG accommodation as seamless and stress-free as possible.
          </p>
          <div className="pt-6 flex justify-center">
            <img src="/Screenshot 2026-08-27 163938.png" alt="Cityscape" className="w-full max-w-2xl rounded-2xl shadow-2xl object-cover h-64 md:h-80 border border-indigo-500/30" />
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <History className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Our Story</h2>
          </div>
          <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              FindPG was born in 2025 with a clear and simple vision: to make the process of finding a PG accommodation as seamless and stress-free as possible. Our founder, having personally experienced the struggles of finding safe, affordable, and comfortable PG accommodations in new cities, realized there had to be a better way.
            </p>
            <p>
              We understood that for students, working professionals, and anyone moving to a new city, the search for accommodation is often accompanied by anxiety and uncertainty. Questions about safety, amenities, location, and genuine pricing often go unanswered. That's where FindPG stepped in.
            </p>
            <p>
              Over the years, we have grown from a small local platform to a nationwide service connecting thousands of PG owners with genuine tenants. Our commitment to quality, transparency, and personalized service has remained unchanged since day one.
            </p>
            <div className="pt-4">
               <img src="/Screenshot 2026-08-27 164131.png" alt="Connecting owners and tenants" className="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 object-cover h-48 sm:h-64" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-sm opacity-20 group-hover:opacity-35 transition duration-500" />
          <div className="relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl flex flex-col justify-center h-full space-y-6">
            <div className="space-y-2">
              <div className="text-indigo-600 dark:text-indigo-400 font-semibold tracking-wider text-xs uppercase flex items-center gap-2">
                <Compass className="h-4 w-4" /> OUR MISSION
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-medium text-sm leading-relaxed">
                To provide a trusted, transparent, and hassle-free platform that helps individuals find their ideal PG accommodation while supporting PG owners in connecting with genuine tenants. We aim to eliminate the middlemen, reduce hidden costs, and ensure every listing on our platform is verified and authentic.
              </p>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="text-purple-600 dark:text-purple-400 font-semibold tracking-wider text-xs uppercase flex items-center gap-2">
                <Eye className="h-4 w-4" /> OUR VISION
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-medium text-sm leading-relaxed">
                To become India's most trusted and comprehensive PG accommodation platform, setting the standard for quality, safety, and customer satisfaction. We envision a future where finding accommodation across any city in India is as simple as a few clicks, with complete peace of mind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Verified PGs', value: '5,000+', icon: Building, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/50 dark:bg-indigo-950/20' },
          { label: 'Happy Tenants', value: '50,000+', icon: Smile, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
          { label: 'Cities Covered', value: '25+', icon: Map, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50/50 dark:bg-sky-950/20' },
          { label: 'User Rating', value: '4.8/5', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-center text-center p-6 ${stat.bg} border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-xs hover:scale-105 transition-all duration-300`}
          >
            <stat.icon className={`h-8 w-8 mb-3 ${stat.color} stroke-[1.5]`} />
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stat.value}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* What Sets Us Apart Section */}
      <section className="space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">What Sets Us Apart</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Here's why thousands of students and professionals trust FindPG
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Verified Listings',
              desc: 'Every PG listed on FindPG undergoes a thorough verification process. Our team personally visits each property to verify ownership, amenities, safety measures, and authenticity of photos.',
              icon: ShieldCheck,
              color: 'text-indigo-600 dark:text-indigo-400',
              bg: 'bg-indigo-50 dark:bg-indigo-950/30'
            },
            {
              title: 'Dedicated Support Team',
              desc: "Our customer support team is available 7 days a week to assist you with any queries, concerns, or guidance. From initial inquiry to final move-in, we're with you at every step.",
              icon: Headphones,
              color: 'text-emerald-600 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-950/30'
            },
            {
              title: 'Prime Locations',
              desc: "We focus on PGs located in safe, well-connected neighborhoods near colleges, IT parks, metro stations, and commercial hubs – ensuring you're never far from where you need to be.",
              icon: MapPin,
              color: 'text-rose-600 dark:text-rose-400',
              bg: 'bg-rose-50 dark:bg-rose-950/30'
            },
            {
              title: 'Transparent Pricing',
              desc: 'No hidden charges, no brokerage fees. What you see is what you pay. All rent details, security deposit, and any additional costs are clearly mentioned upfront.',
              icon: CheckCircle2,
              color: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-50 dark:bg-amber-950/30'
            },
            {
              title: 'Safety First',
              desc: "For women's PGs, we verify additional security measures including CCTV, female staff, visitor policies, and neighborhood safety to ensure complete peace of mind.",
              icon: Lock,
              color: 'text-purple-600 dark:text-purple-400',
              bg: 'bg-purple-50 dark:bg-purple-950/30'
            },
            {
              title: 'Quick Response Time',
              desc: 'Submit an inquiry and expect a response within 24 hours. Our streamlined process ensures you don\'t have to wait days to get information about your preferred PG.',
              icon: Zap,
              color: 'text-sky-600 dark:text-sky-400',
              bg: 'bg-sky-50 dark:bg-sky-950/30'
            }
          ].map((item, idx) => (
            <Card key={idx} className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 space-y-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Our Core Values Section */}
      <section className="space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Our Core Values</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
            The principles that guide everything we do
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Integrity & Trust',
              desc: 'We believe in complete honesty and transparency. If a PG doesn\'t meet our standards, it doesn\'t make it to our platform. We only list properties we would recommend to our own family and friends.',
              icon: Award,
              bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            },
            {
              title: 'Customer-Centric Approach',
              desc: 'Every decision we make is with our users in mind. We constantly gather feedback, listen to your needs, and improve our services to provide a better experience for both tenants and PG owners.',
              icon: Users,
              bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            },
            {
              title: 'Continuous Innovation',
              desc: 'We embrace technology and innovation to make the PG search process smarter and more efficient. From virtual tours to instant booking, we\'re always exploring new ways to serve you better.',
              icon: Cpu,
              bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
            },
            {
              title: 'Community Focus',
              desc: 'We\'re not just a platform; we\'re building a community. We facilitate connections, share safety tips, and create resources that help tenants and PG owners thrive together.',
              icon: Globe,
              bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }
          ].map((val, idx) => (
            <Card key={idx} className="border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 rounded-2xl flex flex-col justify-between overflow-hidden hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 space-y-4 flex-1">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${val.bg}`}>
                  <val.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{val.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{val.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Ready to Find Your Perfect PG / CTA Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 sm:p-12 text-center border border-indigo-500/20 shadow-xl space-y-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.12),transparent_40%)]" />
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to Find Your Perfect PG?</h2>
          <p className="text-indigo-200/80 text-sm sm:text-base max-w-lg mx-auto">
            Join thousands of satisfied tenants who found their home through FindPG
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-4 justify-center items-center">
          <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md px-6 py-2">
            <Link to="/search?type=boys">Browse Boys PGs</Link>
          </Button>
          <Button asChild className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md px-6 py-2">
            <Link to="/search?type=co-ed">Browse Co-living</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-100 font-semibold px-6 py-2">
            <Link to="/search?type=girls">Browse Girls PGs</Link>
          </Button>
        </div>

        <div className="relative z-10 h-px bg-slate-800 max-w-sm mx-auto" />

        <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-indigo-200/70">
          <span className="font-semibold text-white">Or reach out to us directly:</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a href="tel:+916302854691" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="h-4 w-4" />
              +91 6302854691
            </a>
            <a href="mailto:inthiyazhussain69@gmail.com" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="h-4 w-4" />
              inthiyazhussain69@gmail.com
            </a>
          </div>
        </div>
      </section>
      
    </div>
  )
}
