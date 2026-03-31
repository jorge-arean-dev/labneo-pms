import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Estado badges - Solicitudes & Citas fotogrametría
    // Enviada / Pendiente (blue)
    'bg-blue-100', 'text-blue-700', 'dark:bg-blue-950', 'dark:text-blue-300',
    // En proceso (yellow)
    'bg-yellow-100', 'text-yellow-700', 'dark:bg-yellow-950', 'dark:text-yellow-300',
    // Alta generada / Aceptada (green)
    'bg-green-100', 'text-green-700', 'dark:bg-green-950', 'dark:text-green-300',
    // Rechazada (red)
    'bg-red-100', 'text-red-700', 'dark:bg-red-950', 'dark:text-red-300',
    // Finalizada (gray)
    'bg-gray-100', 'text-gray-700', 'dark:bg-gray-950', 'dark:text-gray-300',
    // Solicitudes en_proceso (amber)
    'bg-amber-100', 'text-amber-700', 'dark:bg-amber-950', 'dark:text-amber-300',
    // Citas pendiente (sky)
    'bg-sky-100', 'text-sky-700', 'dark:bg-sky-950', 'dark:text-sky-300',
    // Citas aceptada (emerald)
    'bg-emerald-100', 'text-emerald-700', 'dark:bg-emerald-950', 'dark:text-emerald-300',
    // Citas finalizada (slate)
    'bg-slate-100', 'text-slate-600', 'dark:bg-slate-800', 'dark:text-slate-400',
    // Role colors - for sidebar user section
    'text-amber-600', 'dark:text-amber-400',    // Administración
    'text-sky-600', 'dark:text-sky-400',        // Odontólogo
    'text-teal-600', 'dark:text-teal-400',      // Técnico
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pulse-deep": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "slide-in-top": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "pulse-slow": "pulse-deep 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slide-in-top 0.3s ease-out",
        "fade-out": "fade-out 0.5s ease-in forwards",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
