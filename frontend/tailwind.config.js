/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Locked palette — NextSkill_Final_Color_Usage_Guide_v2. Exactly
        // five brand colors; white/success/warning/danger are neutral or
        // semantic tokens, not brand colors. Do not change these per-screen.
        forest: "#1E3A2B", // brand / actions
        periwinkle: "#CFDCFF", // secondary / personality
        lime: "#EFF87A", // attention — 1-3% of any screen, never a fill
        cream: "#F8F4F0", // dominant canvas
        charcoal: "#171717", // typography / contrast
        muted: "#626762",
        border: "#E4DED7",
        success: "#2F7D4A",
        warning: "#A34B3A",
        danger: "#B42318",
      },
      fontFamily: {
        display: ["Aalto Display", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
