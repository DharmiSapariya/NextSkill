import AnnouncementBar from "./sections/AnnouncementBar";
import Navbar from "./sections/Navbar";
import Hero from "./sections/Hero";
import Problem from "./sections/Problem";
import Solution from "./sections/Solution";
import FeatureGrid from "./sections/FeatureGrid";
import SkillsCloud from "./sections/SkillsCloud";
import Reassurance from "./sections/Reassurance";
import HowItWorksSection from "./sections/HowItWorksSection";
import Evidence from "./sections/Evidence";
import Pricing from "./sections/Pricing";
import Footer from "./sections/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <FeatureGrid />
        <SkillsCloud />
        <Reassurance />
        <HowItWorksSection />
        <Evidence />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
