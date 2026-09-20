import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette pulled from the V&V logo
        navy: {
          DEFAULT: "#0c1424",
          900: "#080e1a",
          800: "#0c1424",
          700: "#131d33",
          600: "#1c2942",
        },
        gold: {
          DEFAULT: "#d4af37",
          light: "#f1d27a",
          dark: "#a9821f",
        },
        cream: "#f3efe6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(12,20,36,0.08), 0 8px 24px rgba(12,20,36,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
