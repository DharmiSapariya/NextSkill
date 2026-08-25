import FoldText from "./FoldText";

// The hollow N (lime) / S (periwinkle) glyph treatment, shared between the
// full-screen intro (huge, plays the fold-in once) and the nav's corner
// mark (tiny, static — it's the same logo the intro's morphed into, not a
// separate thing replaying its own entrance). Stroke width is expressed
// in em so it scales with fontSize, but the *ratio* that reads as a clean
// hollow outline at a 250px display size reads as invisible hairline at
// 20px — nStroke/sStroke let each usage tune that independently rather
// than sharing one constant that only works at one size.
const SPECIAL = { 0: "n", 4: "s" };

function buildRenderChar(nStroke, sStroke) {
  return function renderNextSkillChar(char, index) {
    const special = SPECIAL[index];
    if (special === "n") {
      return (
        <span className="text-lime" style={{ WebkitTextStroke: `${nStroke}em var(--color-accent)`, color: "transparent" }}>
          N
        </span>
      );
    }
    if (special === "s") {
      return (
        <span
          className="text-periwinkle"
          style={{ WebkitTextStroke: `${sStroke}em var(--color-secondary)`, color: "transparent" }}
        >
          S
        </span>
      );
    }
    return char;
  };
}

export default function NextSkillLogo({
  trigger = "mount",
  fontSize = "3rem",
  fontWeight = 600,
  duration = 0.9,
  stagger = 0.09,
  nStroke = 0.012,
  sStroke = 0.014,
  className = "",
  style,
}) {
  return (
    <FoldText
      text="NEXTSKILL"
      splitBy="char"
      hinge="bottom"
      trigger={trigger}
      duration={duration}
      stagger={stagger}
      ease="power3.out"
      creaseShading={0.6}
      perspective={900}
      color="var(--color-background)"
      fontSize={fontSize}
      fontWeight={fontWeight}
      renderChar={buildRenderChar(nStroke, sStroke)}
      className={`font-display [letter-spacing:0.03em] ${className}`.trim()}
      style={{ whiteSpace: "nowrap", ...style }}
    />
  );
}
