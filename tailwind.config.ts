import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ecfeff",
        jade: "#2dd4bf",
        jadeDark: "#14b8a6",
        mint: "#0f766e",
        clay: "#1e293b",
        stone: "#0f172a"
      },
      boxShadow: {
        soft: "0 22px 80px rgba(0, 0, 0, 0.30)"
      }
    }
  },
  plugins: []
};

export default config;
