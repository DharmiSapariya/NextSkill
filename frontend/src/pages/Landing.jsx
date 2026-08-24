import Hero from "../intro/Hero";
import ScrollCursor from "../landing/ScrollCursor";
import IntroStatement from "../landing/IntroStatement";
import ScrollStroke from "../landing/ScrollStroke";
import FeatureGrid from "../landing/FeatureGrid";
import StatsBand from "../landing/StatsBand";
import Testimonials from "../landing/Testimonials";
import CTASection from "../landing/CTASection";
import Footer from "../landing/Footer";

// The full landing page. Hero plays the NEXTSKILL entrance once on
// mount and then sits in normal document flow; everything below it is
// plain scroll-triggered content — nothing here re-runs or resets when
// scrolling back up.
export default function Landing() {
  return (
    <>
      <ScrollCursor />
      <Hero />
      <IntroStatement />
      <ScrollStroke />
      <FeatureGrid />
      <StatsBand />
      <Testimonials />
      <CTASection />
      <Footer />
    </>
  );
}
