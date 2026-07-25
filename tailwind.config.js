/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        lg: "2rem",
      },
    },
    extend: {
      colors: {
        stone: "#0B0B0F",
        shadow: "#24152F",
        parchment: "#D8C7A5",
        "parchment-dim": "#B8A47E",
        gold: "#C9A227",
        ember: "#E0A458",
        ink: "#1A1410",
      },
      fontFamily: {
        display: ['"Cinzel"', "serif"],
        serif: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        ui: ['"Libre Baskerville"', '"Noto Serif SC"', "serif"],
        zh: ['"Noto Serif SC"', "serif"],
      },
      letterSpacing: {
        widest2: "0.25em",
        widest3: "0.4em",
      },
      boxShadow: {
        "gold-glow": "0 0 24px rgba(201, 162, 39, 0.25), 0 0 1px rgba(201, 162, 39, 0.4) inset",
        "parchment-deep": "0 24px 60px -12px rgba(0, 0, 0, 0.85), 0 8px 24px -8px rgba(0, 0, 0, 0.7)",
        "candle-glow": "0 0 40px 8px rgba(224, 164, 88, 0.55)",
      },
      backgroundImage: {
        "stone-wall":
          "radial-gradient(ellipse at 20% 30%, rgba(36, 21, 47, 0.55) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(36, 21, 47, 0.45) 0%, transparent 60%), linear-gradient(160deg, #0B0B0F 0%, #11091a 50%, #0B0B0F 100%)",
        "parchment-paper":
          "radial-gradient(ellipse at 30% 20%, rgba(255, 240, 200, 0.18) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(120, 90, 50, 0.12) 0%, transparent 60%), linear-gradient(135deg, #D8C7A5 0%, #C9B68E 50%, #D8C7A5 100%)",
      },
      animation: {
        flicker: "flicker 3.2s ease-in-out infinite",
        "flicker-slow": "flicker 5.5s ease-in-out infinite",
        breathe: "breathe 7s ease-in-out infinite",
        drift: "drift 40s linear infinite",
        "rain-fall": "rain-fall 0.6s linear infinite",
        "pulse-gold": "pulse-gold 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
