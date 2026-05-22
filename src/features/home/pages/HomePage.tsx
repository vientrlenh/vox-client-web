import {
  AudienceSection,
  BenefitSection,
  CTASection,
  FeatureSection,
  HeroSection,
  LandingFooter,
  ProblemSection,
} from '../components/LandingSections'

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <HeroSection />
      <ProblemSection />
      <FeatureSection />
      <AudienceSection />
      <BenefitSection />
      <CTASection />
      <LandingFooter />
    </main>
  )
}
