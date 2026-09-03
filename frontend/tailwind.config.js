/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#1E3A2B",
        "forest-2": "#14261C",
        periwinkle: "#CFDCFF",
        lime: "#EFF87A",
        cream: "#F8F4F0",
        ink: "#14261C",
        "cream-on-dark": "#FAFDEE",
        // Secondary accent palette — pastel-toned to sit alongside
        // periwinkle/lime rather than compete with them. Used for
        // categorical color-coding (skill categories, badges) where a
        // single accent color can't distinguish enough groups.
        coral: "#F4A688",
        sky: "#A9DDEA",
        amber: "#F3C468",
        violet: "#CDB6EE",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        kicker: ["Farro", "system-ui", "sans-serif"],
      },
      animation: {
        orbit: "orbit calc(var(--duration)*1s) linear infinite",
      },
      keyframes: {
        orbit: {
          "0%": {
            transform:
              "rotate(calc(var(--angle) * 1deg)) translateY(calc(var(--radius) * 1px)) rotate(calc(var(--angle) * -1deg))",
          },
          "100%": {
            transform:
              "rotate(calc(var(--angle) * 1deg + 360deg)) translateY(calc(var(--radius) * 1px)) rotate(calc((var(--angle) + 360) * -1deg))",
          },
        },
      },
    },
  },
  plugins: [],
}
