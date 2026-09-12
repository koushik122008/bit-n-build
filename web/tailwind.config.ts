import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#05070A",
        panel: "#0E131A",
        panelRaised: "#141B24",
        hairline: "rgba(255,255,255,0.08)",
        primary: "#E7ECF2",
        muted: "#7C8797",
        nominal: "#35D0BA",
        warn: "#F2A93C",
        critical: "#FF4757",
        info: "#6E8CFF",
      },
      fontFamily: {
        sans: ["Inter", "Space Grotesk", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "JetBrains Mono", "Courier New", "monospace"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "marquee-slow": "marquee 60s linear infinite",
        "fade-in": "fade-in 0.25s ease-out",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
