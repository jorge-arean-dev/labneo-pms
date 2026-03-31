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
    // Estado badges - always include these classes to prevent purging
    // Programada (blue)
    'bg-blue-100', 'text-blue-700', 'dark:bg-blue-950', 'dark:text-blue-300',
    // En Curso (yellow)
    'bg-yellow-100', 'text-yellow-700', 'dark:bg-yellow-950', 'dark:text-yellow-300',
    // Completada (green)
    'bg-green-100', 'text-green-700', 'dark:bg-green-950', 'dark:text-green-300',
    // Cancelada (red)
    'bg-red-100', 'text-red-700', 'dark:bg-red-950', 'dark:text-red-300',
    // Ausente (gray)
    'bg-gray-100', 'text-gray-700', 'dark:bg-gray-950', 'dark:text-gray-300',
    // Email status alert bar (green/yellow/red -50 shades for shell background)
    'bg-green-50', 'border-green-200', 'dark:bg-green-950', 'dark:border-green-800',
    'bg-yellow-50', 'border-yellow-200', 'dark:bg-yellow-950', 'dark:border-yellow-800',
    'bg-red-50', 'border-red-200', 'dark:bg-red-950', 'dark:border-red-800',
    // Patient arrived indicator - uses CSS variables (bg-patient-arrived, border-patient-arrived-border, bg-patient-arrived-sample)
    // Note: These amber text classes are still used for Estado Horario column
    'text-amber-600', 'dark:text-amber-400',
    // Role colors - for sidebar user section
    'text-amber-600', 'dark:text-amber-400',    // Administrador
    'text-blue-600', 'dark:text-blue-400',      // Médico
    'text-emerald-600', 'dark:text-emerald-400', // Recepcionista
    // Médico badge colors - for recepcionista dashboard
    'bg-slate-50', 'text-slate-600', 'dark:bg-slate-900', 'dark:text-slate-400',
    // Pacientes en Espera banner (blue)
    'border-blue-500', 'bg-blue-50', 'bg-blue-500', 'dark:bg-blue-950/20',
    // Tipo Consulta letter badges
    // Primera vez (indigo)
    'bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900', 'dark:text-indigo-300',
    // Control (emerald)
    'bg-emerald-100', 'text-emerald-700', 'dark:bg-emerald-900', 'dark:text-emerald-300',
    // Urgencia (orange)
    'bg-orange-100', 'text-orange-700', 'dark:bg-orange-900', 'dark:text-orange-300',
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
        "patient-arrived": {
          DEFAULT: "hsl(var(--patient-arrived))",
          border: "hsl(var(--patient-arrived-border))",
          sample: "hsl(var(--patient-arrived-sample))",
        },
        "cal-available": {
          DEFAULT: "hsl(var(--cal-available))",
          fg: "hsl(var(--cal-available-fg))",
          hover: "hsl(var(--cal-available-hover))",
          ring: "hsl(var(--cal-available-ring))",
        },
        "cal-selected": {
          DEFAULT: "hsl(var(--cal-selected))",
          fg: "hsl(var(--cal-selected-fg))",
          hover: "hsl(var(--cal-selected-hover))",
        },
        "cal-today": {
          ring: "hsl(var(--cal-today-ring))",
        },
        "cal-disabled": {
          fg: "hsl(var(--cal-disabled-fg))",
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
