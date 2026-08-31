import { useRef } from "react";
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
import ScrollConnector from "./components/ScrollConnector";

export default function Landing() {
  const heroToProblemRef = useRef(null);
  const ctaRef = useRef(null);
  const problemHeadlineRef = useRef(null);

  return (
    <div className="min-h-screen bg-cream">
      <AnnouncementBar />
      <Navbar />
      <main>
        <div ref={heroToProblemRef} className="relative">
          <ScrollConnector
            containerRef={heroToProblemRef}
            startRef={ctaRef}
            endRef={problemHeadlineRef}
            className="pointer-events-none z-20 hidden md:block"
          />
          <Hero ctaRef={ctaRef} />
          <Problem endRef={problemHeadlineRef} />
        </div>
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
