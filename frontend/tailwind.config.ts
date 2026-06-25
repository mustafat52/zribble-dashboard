import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light slate backgrounds
        slate: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          150: "#ECF1F7",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        // Deep indigo as primary accent
        accent: {
          DEFAULT:  "#4F46E5",
          hover:    "#4338CA",
          light:    "#EEF2FF",
          border:   "#C7D2FE",
          muted:    "#6366F1",
          green:    "#059669",
          amber:    "#D97706",
          red:      "#DC2626",
          cyan:     "#0891B2",
          purple:   "#7C3AED",
          greenLight: "#ECFDF5",
          amberLight: "#FFFBEB",
          redLight:   "#FEF2F2",
          cyanLight:  "#ECFEFF",
        },
        surface: {
          DEFAULT:     "#F8FAFC",
          card:        "#FFFFFF",
          elevated:    "#F1F5F9",
          border:      "#E2E8F0",
          borderLight: "#CBD5E1",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(100,116,139,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      boxShadow: {
        card:  "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        md:    "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
        lg:    "0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.05)",
        xl:    "0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-in-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;