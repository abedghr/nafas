/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nafas brand
        primary: { DEFAULT: "#00C896", dark: "#00A87A" },
        accent: { DEFAULT: "#FF6B35", light: "#FF8C5E" },
        // Dark surfaces (mirror constants/colors.ts dark theme)
        bg: "#0A0A0F",
        surface: "#141420",
        card: "#1C1C2E",
        "card-alt": "#232338",
        line: "#2A2A3E",
        sub: "#9B9BB0",
        muted: "#5C5C72",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
