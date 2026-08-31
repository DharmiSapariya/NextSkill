import { useEffect, useState } from "react";

// Ported from the spec's TypingAnimation — trimmed to the words-array
// typing/deleting cycle mode, since that's the only mode this build uses
// (the hero's rotating role name).
export default function TypingAnimation({
  words = [],
  loop = true,
  typeSpeed = 100,
  deleteSpeed = 50,
  pauseDelay = 1000,
  showCursor = true,
  className = "",
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) return undefined;
    const current = words[wordIndex];
    const atEnd = charIndex === current.length;
    const atStart = charIndex === 0;

    if (!deleting && atEnd) {
      if (!loop && wordIndex === words.length - 1) return undefined;
      const t = setTimeout(() => setDeleting(true), pauseDelay);
      return () => clearTimeout(t);
    }

    if (deleting && atStart) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
      return undefined;
    }

    const t = setTimeout(
      () => setCharIndex((i) => i + (deleting ? -1 : 1)),
      deleting ? deleteSpeed : typeSpeed
    );
    return () => clearTimeout(t);
  }, [charIndex, deleting, wordIndex, words, loop, typeSpeed, deleteSpeed, pauseDelay]);

  const text = words[wordIndex]?.slice(0, charIndex) ?? "";

  return (
    <span className={className}>
      {text}
      {showCursor && <span className="ml-0.5 inline-block animate-pulse">|</span>}
    </span>
  );
}
