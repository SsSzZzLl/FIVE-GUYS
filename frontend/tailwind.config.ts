import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0B0A16",
        neonPrimary: "#8F5FFF",
        neonSecondary: "#53F6DB",
        accentWarning: "#FFCD5D",
        textPrimary: "#F5F4FF",
        textSecondary: "#B7B3D9",
      },
      fontFamily: {
        arcade: ["'Press Start 2P'", "monospace"],
      },
      boxShadow: {
        neon: "0 0 25px rgba(143, 95, 255, 0.45)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;

