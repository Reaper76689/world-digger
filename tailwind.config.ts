import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18211f",
        jade: "#1e8a68",
        jadeDark: "#14634d",
        mint: "#e8f6ef",
        clay: "#f5f0e8",
        stone: "#faf8f3"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(16, 30, 27, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
