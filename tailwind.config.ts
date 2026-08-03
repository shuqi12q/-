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
        bg: { base: "var(--bg-base)", elevated: "var(--bg-elevated)", sunken: "var(--bg-sunken)", tint: "var(--bg-tint)" },
        forest: { 900: "var(--forest-900)", 700: "var(--forest-700)", 600: "var(--forest-600)", 500: "var(--forest-500)", 300: "var(--forest-300)", 100: "var(--forest-100)" },
        wood: { 700: "var(--wood-700)", 500: "var(--wood-500)", 300: "var(--wood-300)", 100: "var(--wood-100)" },
        mist: { 600: "var(--mist-600)" },
        care: { 700: "var(--care-700)", 600: "var(--care-600)", 100: "var(--care-100)" },
        txt: { primary: "var(--text-primary)", secondary: "var(--text-secondary)", tertiary: "var(--text-tertiary)", disabled: "var(--text-disabled)", inverse: "var(--text-inverse)" },
        v: { pos2: "var(--v-pos2)", pos1: "var(--v-pos1)", zero: "var(--v-zero)", neg1: "var(--v-neg1)", neg2: "var(--v-neg2)", none: "var(--v-none)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        xs: "var(--r-xs)", sm: "var(--r-sm)", md: "var(--r-md)", lg: "var(--r-lg)", xl: "var(--r-xl)", "2xl": "var(--r-2xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)", ambient: "var(--shadow-ambient)",
      },
    },
  },
  plugins: [],
};
export default config;
