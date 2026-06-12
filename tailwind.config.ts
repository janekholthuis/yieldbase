import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  			display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  		},
  		colors: {
  			background: 'oklch(var(--background) / <alpha-value>)',
  			foreground: 'oklch(var(--foreground) / <alpha-value>)',
  			surface: 'oklch(var(--surface) / <alpha-value>)',
  			highlight: {
  				bg: 'oklch(var(--highlight-bg) / <alpha-value>)',
  				fg: 'oklch(var(--highlight-fg) / <alpha-value>)'
  			},
  			card: {
  				DEFAULT: 'oklch(var(--card) / <alpha-value>)',
  				foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
  				foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
  			},
  			primary: {
  				DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
  				foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
  				light: 'oklch(var(--primary-light) / <alpha-value>)'
  			},
  			'primary-light': 'oklch(var(--primary-light) / <alpha-value>)',
  			secondary: {
  				DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
  				foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
  				foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
  				foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
  				foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
  			},
  			success: {
  				DEFAULT: 'oklch(var(--success) / <alpha-value>)',
  				foreground: 'oklch(var(--success-foreground) / <alpha-value>)'
  			},
  			warning: {
  				DEFAULT: 'oklch(var(--warning) / <alpha-value>)',
  				foreground: 'oklch(var(--warning-foreground) / <alpha-value>)'
  			},
  			info: {
  				DEFAULT: 'oklch(var(--info) / <alpha-value>)',
  				foreground: 'oklch(var(--info-foreground) / <alpha-value>)'
  			},
  			border: 'oklch(var(--border) / <alpha-value>)',
  			input: 'oklch(var(--input) / <alpha-value>)',
  			ring: 'oklch(var(--ring) / <alpha-value>)',
  			chart: {
  				'1': 'oklch(var(--chart-1) / <alpha-value>)',
  				'2': 'oklch(var(--chart-2) / <alpha-value>)',
  				'3': 'oklch(var(--chart-3) / <alpha-value>)',
  				'4': 'oklch(var(--chart-4) / <alpha-value>)',
  				'5': 'oklch(var(--chart-5) / <alpha-value>)'
  			},
  			sidebar: {
  				DEFAULT: 'oklch(var(--sidebar) / <alpha-value>)',
  				foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
  				primary: 'oklch(var(--sidebar-primary) / <alpha-value>)',
  				'primary-foreground': 'oklch(var(--sidebar-primary-foreground) / <alpha-value>)',
  				accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
  				'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
  				border: 'oklch(var(--sidebar-border) / <alpha-value>)',
  				ring: 'oklch(var(--sidebar-ring) / <alpha-value>)'
  			},
  			/* Präsentations-Modus tokens (dark slideshow) — CONSTANT hex */
  			anthrazit: '#0F1B2E',
  			'off-white': '#F6F7F9',
  			graphit: {
  				'700': '#243A57',
  				'800': '#152538',
  				'900': '#0B1626'
  			},
  			/* Brand tokens (DealOS palette) — CONSTANT hex, theme-independent */
  			brand: {
  				bg: '#FFFFFF',
  				surface: '#FFFFFF',
  				surfaceMuted: '#F7F8FA',
  				primary: '#0A2E4F',
  				primaryHover: '#0E3B66',
  				primaryDark: '#061E36',
  				primaryTint: '#EEF3F8',
  				accent: '#B8893E',
  				accentHover: '#A0762F',
  				accentSoft: '#F5EBD6',
  				accentTint: '#FBF3E2',
  				accentText: '#8A6420',
  				ink: '#0F172A',
  				body: '#334155',
  				muted: '#64748B',
  				subtle: '#94A3B8',
  				border: '#E5E7EB',
  				borderSoft: '#EEF1F5',
  				divider: '#F1F4F8',
  				success: '#0F7B4F',
  				successSoft: '#E4F2EC',
  				danger: '#C0392B',
  				dangerSoft: '#FBEAE7',
  				warning: '#B8893E',
  				warningSoft: '#F5EBD6',
  				info: '#3E7CB1',
  				infoSoft: '#E8F0F8'
  			}
  		},
  		borderRadius: {
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)',
  			'3xl': 'calc(var(--radius) + 12px)',
  			'4xl': 'calc(var(--radius) + 16px)'
  		},
  		boxShadow: {
  			xs: '0 1px 2px 0 oklch(0.32 0.07 250 / 0.04)',
  			sm: '0 1px 3px 0 oklch(0.32 0.07 250 / 0.06), 0 1px 2px -1px oklch(0.32 0.07 250 / 0.04)',
  			md: '0 4px 6px -1px oklch(0.32 0.07 250 / 0.07), 0 2px 4px -2px oklch(0.32 0.07 250 / 0.05)',
  			lg: '0 10px 15px -3px oklch(0.32 0.07 250 / 0.08), 0 4px 6px -4px oklch(0.32 0.07 250 / 0.06)',
  			card: '0 1px 2px 0 oklch(0.32 0.07 250 / 0.04)',
  			'card-hover': '0 4px 6px -1px oklch(0.32 0.07 250 / 0.07), 0 2px 4px -2px oklch(0.32 0.07 250 / 0.05)',
  			popover: '0 10px 15px -3px oklch(0.32 0.07 250 / 0.08), 0 4px 6px -4px oklch(0.32 0.07 250 / 0.06)',
  			modal: '0 20px 35px -8px oklch(0.32 0.07 250 / 0.18), 0 8px 16px -4px oklch(0.32 0.07 250 / 0.10)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'page-fade': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(4px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'page-fade': 'page-fade 180ms ease-out both',
  			'fade-in': 'fade-in 220ms ease-out both'
  		}
  	}
  },
  plugins: [],
};
export default config;
