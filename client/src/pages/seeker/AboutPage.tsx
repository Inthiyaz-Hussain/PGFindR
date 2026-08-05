import { AboutContent } from '@/components/shared/AboutContent'

export function AboutPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="scroll-m-20 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">About FindPgR</h1>
        <p className="text-muted-foreground mt-1">Learn more about our platform, mission, and how we help you find the perfect stay.</p>
      </div>
      <AboutContent />
    </div>
  )
}
export default AboutPage
