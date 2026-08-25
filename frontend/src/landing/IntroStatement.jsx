import FoldText from "../components/FoldText";
import CircledWord from "./CircledWord";

// Word index of "map" in STATEMENT below (0-based, whitespace-split) —
// the one word this headline hand-circles, the same annotation move as
// the "effortless" circle in the HeyFriends reference.
const CIRCLED_WORD_INDEX = 8;
const STATEMENT =
  "Most people don't lack ambition. They lack a map from the skills they have to the job they actually want.";

function renderStatementWord(word, index) {
  if (index === CIRCLED_WORD_INDEX) return <CircledWord>{word}</CircledWord>;
  return word;
}

// The first thing a visitor reads after the hero settles — one big
// sentence that folds open word by word as it enters the viewport, the
// same hinge language as NEXTSKILL itself but slower and quieter, so the
// hero doesn't feel like a one-off trick.
export default function IntroStatement() {
  return (
    <section className="bg-cream px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl">
        <FoldText
          text={STATEMENT}
          splitBy="word"
          hinge="top"
          trigger="scroll"
          duration={0.6}
          stagger={0.028}
          perspective={500}
          creaseShading={0.35}
          fontSize="clamp(1.75rem, 4.4vw, 3.25rem)"
          fontWeight={500}
          color="var(--color-ink)"
          className="font-display"
          style={{ lineHeight: 1.18 }}
          renderWord={renderStatementWord}
        />
        <div className="mt-10 flex items-center gap-3 font-sans text-sm uppercase tracking-[0.25em] text-forest/60">
          <span className="h-px w-10 bg-forest/30" />
          NextSkill draws that map from real job-posting data
        </div>
      </div>
    </section>
  );
}
