import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Racing-HUD palette
        accent: "#39ff88", // green
        cyan: "#7cf6ff",
        gold: "#ffd34d",
        danger: "#ff6b6b",
        hud: {
          bg0: "#05070a",
          bg1: "#0b1722",
          panel: "#0d1620",
          line: "#1c2b38",
        },
      },
      fontFamily: {
        // Numbers / headings
        orbitron: ["var(--font-orbitron)", "monospace"],
        // Body
        chakra: ["var(--font-chakra)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(57,255,136,0.25)",
        glowCyan: "0 0 24px rgba(124,246,255,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
