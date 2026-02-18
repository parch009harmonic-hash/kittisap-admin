import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f5f7fb",
        sapphire: "#1d4ed8",
        royal: "#1e3a8a",
        steel: "#334155",
        background: "#f7f9fc",
        foreground: "#0f172a",
        surface: "#ffffff",
        border: "#e2e8f0",
        primary: "#1d4ed8",
        "primary-dark": "#1e3a8a",
      },
      boxShadow: {
        "card-soft": "0 20px 45px -30px rgba(15, 23, 42, 0.45)",
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        heading: ["var(--font-heading)"],
      },
    },
  },
  plugins: [],
};

export default config;
