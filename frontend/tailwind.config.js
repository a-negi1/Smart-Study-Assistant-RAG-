export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["DM Sans", "system-ui", "sans-serif"],
        display: ["Lora", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#1a1814",
          deep:    "#110f0d",
          raised:  "#1e1b17",
          hover:   "#2a2620",
        },
        parchment: {
          1: "#e8dfc8",
          2: "#b8aa8e",
          3: "#786b56",
        },
        amber: {
          DEFAULT: "#c9873a",
          dim:     "rgba(201,135,58,0.12)",
          rule:    "rgba(201,135,58,0.55)",
        },
        rule: {
          DEFAULT: "rgba(232,223,200,0.07)",
          strong:  "rgba(232,223,200,0.13)",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "panel":   "0 1px 3px rgba(0,0,0,0.6)",
        "card":    "0 2px 8px rgba(0,0,0,0.50)",
        "card-up": "0 4px 20px rgba(0,0,0,0.60)",
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out forwards",
        "slide-in": "slideIn 0.25s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
