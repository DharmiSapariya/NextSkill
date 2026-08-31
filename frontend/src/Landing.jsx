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
import SiteConnector from "./components/SiteConnector";

export default function Landing() {
  const pageRef = useRef(null);
  const heroBoxRef = useRef(null);
  const footerRef = useRef(null);

  return (
    <div ref={pageRef} className="relative min-h-screen bg-cream">
      <SiteConnector
        containerRef={pageRef}
        startRef={heroBoxRef}
        endRef={footerRef}
        className="pointer-events-none z-20 hidden md:block"
      />
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero boxRef={heroBoxRef} />
        <Problem />
        <Solution />
        <FeatureGrid />
        <SkillsCloud />
        <Reassurance />
        <HowItWorksSection />
        <Evidence />
        <Pricing />
      </main>
      <Footer topRef={footerRef} />
    </div>
  );
}
