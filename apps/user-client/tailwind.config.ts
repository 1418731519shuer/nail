import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        orchid: {
          50:  "#FEF6F2",
          100: "#FDEEE6",
          200: "#FAD8C4",
          300: "#F5B898",
          400: "#EE9068",
          500: "#CF6338",
          600: "#B8502A",
        },
        plum: "#CF6338",
        mist: "#A07860",
      },
      boxShadow: {
        soft: "0 22px 60px rgba(140, 75, 40, 0.13)",
        glow: "0 18px 40px rgba(207, 99, 56, 0.26)",
        "glow-sm": "0 8px 24px rgba(207, 99, 56, 0.20)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo":  "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in":  { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "fade-in":  "fade-in 180ms ease both",
        "slide-up": "slide-up 260ms cubic-bezier(0.25,1,0.5,1) both",
        "scale-in": "scale-in 240ms cubic-bezier(0.16,1,0.3,1) both",
        shimmer:    "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
