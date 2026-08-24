/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Starting point only — carries over the coral accent already
        // established in dashboard/.streamlit/config.toml (primaryColor
        // #FF4B4B), so the two frontends don't clash on brand color while
        // this one gets built out page by page.
        primary: "#FF4B4B",
        ink: "#161616",
        surface: "#F7F7FA",
      },
    },
  },
  plugins: [],
}

