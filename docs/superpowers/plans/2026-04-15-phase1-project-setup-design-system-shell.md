# Phase 1: Project Setup, Design System & Application Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Vite + React 19 + TypeScript project with Tailwind CSS, Shadcn UI, 8 themes (16 combos), the complete application shell (Header, Sidebar, Notifications, Global Search), and foundational contexts (Auth, Theme, Sidebar).

**Architecture:** Single SPA with React Router. Design tokens via CSS variables scoped to `[data-theme]` and `.dark` selectors. Shadcn UI components installed via CLI and restyled with comprint tokens. Layout uses sticky positioning for Header, Sidebar, Tab rows, and Table headers.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Shadcn UI (Radix), React Router, Lucide React, MSW

---

## File Structure

```
comprint-theme/
├── public/
│   └── assets/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root component with providers
│   │   ├── router.tsx                 # React Router config
│   │   └── providers.tsx              # Composed providers
│   ├── components/
│   │   ├── ui/                        # Shadcn base components (installed via CLI)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           # Main layout: header + sidebar + content
│   │   │   ├── Header.tsx             # Sticky top nav
│   │   │   ├── Sidebar.tsx            # Collapsible sidebar with grouped nav
│   │   │   ├── sidebar-nav-config.ts  # Navigation items config
│   │   │   ├── NotificationPopover.tsx # Bell icon + notification dropdown
│   │   │   ├── GlobalSearch.tsx       # Command palette (Cmd+K)
│   │   │   ├── ThemeSwitcher.tsx      # Theme + light/dark dropdown
│   │   │   ├── UserMenu.tsx           # Avatar + dropdown menu
│   │   │   ├── DevRoleSwitcher.tsx    # Dev-only role switcher
│   │   │   └── FloatingQueryButton.tsx # Scroll-to-top FAB
│   │   └── common/
│   │       └── PermissionGate.tsx     # RBAC gate component
│   ├── contexts/
│   │   ├── AuthContext.tsx            # Mock auth with 17 roles
│   │   ├── ThemeContext.tsx           # 8 themes x light/dark
│   │   └── SidebarContext.tsx         # Collapse state
│   ├── styles/
│   │   ├── index.css                  # Tailwind directives + base styles
│   │   └── themes.css                 # 16 theme variable sets
│   ├── lib/
│   │   └── utils.ts                   # cn() helper
│   ├── types/
│   │   ├── auth.ts                    # User, Role, Permission types
│   │   └── navigation.ts             # Nav item types
│   ├── constants/
│   │   ├── roles.ts                   # Role configs with hierarchy
│   │   └── mock-users.ts             # Preset users for dev switcher
│   ├── hooks/
│   │   └── use-scroll-position.ts     # Scroll hook for FAB
│   └── main.tsx                       # Entry point
├── index.html
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── postcss.config.js
├── components.json                    # Shadcn config
├── package.json
└── .gitignore
```

---

## Task 1: Initialize Vite Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `src/main.tsx`, `src/app/App.tsx`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/amardaxini/projects/comprint/theme
npm create vite@latest . -- --template react-ts
```

If prompted about non-empty directory, choose to proceed (only docs/ exists).

- [ ] **Step 2: Install core dependencies**

```bash
npm install react@19 react-dom@19 react-router-dom@7 lucide-react tailwind-merge clsx
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer @types/node
```

- [ ] **Step 4: Configure vite.config.ts**

Replace `vite.config.ts` with:

```typescript
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
  },
})
```

- [ ] **Step 5: Update tsconfig.json for path aliases**

Replace `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Replace `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create lib/utils.ts**

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Create minimal App.tsx**

```typescript
// src/app/App.tsx
export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="text-3xl font-bold p-8">comprint<span className="font-serif">tech</span></h1>
      <p className="px-8 text-muted-foreground">Foundation loading...</p>
    </div>
  )
}
```

- [ ] **Step 8: Update main.tsx**

```typescript
// src/main.tsx
import './styles/index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 9: Create placeholder index.css**

```css
/* src/styles/index.css */
@import 'tailwindcss';
```

- [ ] **Step 10: Verify the app runs**

```bash
npm run dev
```

Expected: App starts at http://localhost:5173 showing "comprinttech" heading.

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Vite + React 19 + TypeScript project"
```

---

## Task 2: Install and Configure Shadcn UI

**Files:**
- Create: `components.json`, `src/components/ui/button.tsx`, `src/components/ui/sonner.tsx` (and other Shadcn components)
- Modify: `src/styles/index.css`, `package.json`

- [ ] **Step 1: Initialize Shadcn UI**

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Zinc**
- CSS variables: **Yes**
- CSS file: `src/styles/index.css`
- Tailwind config: leave default
- Components alias: `@/components`
- Utils alias: `@/lib/utils`
- React Server Components: **No**

- [ ] **Step 2: Install core Shadcn components (batch 1 — layout essentials)**

```bash
npx shadcn@latest add button badge avatar dropdown-menu popover dialog sheet tooltip separator skeleton scroll-area
```

- [ ] **Step 3: Install Shadcn components (batch 2 — navigation & data)**

```bash
npx shadcn@latest add command tabs table card accordion collapsible breadcrumb sidebar navigation-menu
```

- [ ] **Step 4: Install Shadcn components (batch 3 — forms & feedback)**

```bash
npx shadcn@latest add input select textarea checkbox radio-group switch label form alert alert-dialog sonner progress slider toggle toggle-group
```

- [ ] **Step 5: Install Shadcn components (batch 4 — remaining)**

```bash
npx shadcn@latest add hover-card resizable context-menu menubar drawer aspect-ratio pagination calendar
```

- [ ] **Step 6: Verify components are installed**

```bash
ls src/components/ui/
```

Expected: 30+ component files in `src/components/ui/`.

- [ ] **Step 7: Verify app still runs**

```bash
npm run dev
```

Expected: No errors. App loads correctly.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: install and configure Shadcn UI with all base components"
```

---

## Task 3: Implement Design System — Typography & Colors

**Files:**
- Modify: `src/styles/index.css`
- Modify: `index.html` (add Google Fonts)

- [ ] **Step 1: Add Google Fonts to index.html**

Add inside `<head>` in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Update index.css with typography and base styles**

Replace `src/styles/index.css` with:

```css
@import 'tailwindcss';
@import './themes.css';

/* ── Custom theme tokens for Tailwind ── */
@theme {
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Primary Teal Scale */
  --color-primary-50: #f0fafa;
  --color-primary-100: #d1eded;
  --color-primary-200: #a3dbdb;
  --color-primary-300: #75c9c9;
  --color-primary-400: #47b7b7;
  --color-primary-500: #2b8a8a;
  --color-primary-600: #236e6e;
  --color-primary-700: #1b5353;
  --color-primary-800: #133737;
  --color-primary-900: #0b1c1c;
  --color-primary-950: #060e0e;

  /* Status Colors */
  --color-status-error-text: #b91c1c;
  --color-status-error-bg: #fee2e2;
  --color-status-success-text: #15803d;
  --color-status-success-bg: #dcfce7;
  --color-status-warning-text: #a16207;
  --color-status-warning-bg: #fef9c3;
  --color-status-info-text: #1d4ed8;
  --color-status-info-bg: #dbeafe;
}

/* ── Base Styles ── */
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-serif;
  }

  h1 { @apply text-4xl font-bold; }
  h2 { @apply text-3xl font-semibold; }
  h3 { @apply text-2xl font-semibold; }
  h4 { @apply text-xl font-semibold; }
  h5 { @apply text-lg font-medium; }
  h6 { @apply text-base font-medium; }
}

/* ── Red Cell Utility ── */
@layer utilities {
  .red-cell {
    @apply text-status-error-text bg-status-error-bg;
  }

  .success-cell {
    @apply text-status-success-text bg-status-success-bg;
  }

  .warning-cell {
    @apply text-status-warning-text bg-status-warning-bg;
  }

  .info-cell {
    @apply text-status-info-text bg-status-info-bg;
  }
}

/* ── Custom Scrollbar ── */
@layer base {
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }
}
```

- [ ] **Step 3: Verify typography renders**

Update `src/app/App.tsx` temporarily:

```typescript
export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-4">
      <h1>comprint<span className="font-sans text-primary-500">tech</span> — Heading 1</h1>
      <h2>Heading 2 — Serif Font</h2>
      <h3>Heading 3 — Serif Font</h3>
      <p className="font-sans">Body text — Inter Sans-serif. This is the default paragraph style.</p>
      <p className="font-mono text-sm">Monospace — JetBrains Mono</p>
      <div className="flex gap-4 mt-4">
        <span className="red-cell px-3 py-1 rounded text-sm font-medium">Red Cell: -15%</span>
        <span className="success-cell px-3 py-1 rounded text-sm font-medium">Success: +22%</span>
        <span className="warning-cell px-3 py-1 rounded text-sm font-medium">Warning: Low</span>
        <span className="info-cell px-3 py-1 rounded text-sm font-medium">Info: Pending</span>
      </div>
    </div>
  )
}
```

```bash
npm run dev
```

Expected: Headings render in Playfair Display serif. Body in Inter. Status cells show colored text on colored backgrounds.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add typography system with serif headings, sans body, and status cell utilities"
```

---

## Task 4: Implement 8 Themes (16 Combinations)

**Files:**
- Create: `src/styles/themes.css`

- [ ] **Step 1: Create themes.css with all 16 theme combinations**

```css
/* src/styles/themes.css */

/* ════════════════════════════════════════════════════════════
   Theme 1: Shadcn Default
   ════════════════════════════════════════════════════════════ */
[data-theme='shadcn-default'] {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

[data-theme='shadcn-default'].dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}

/* ════════════════════════════════════════════════════════════
   Theme 2: Comprint CRM (Indigo + Gold)
   ════════════════════════════════════════════════════════════ */
[data-theme='comprint-crm'] {
  --background: 228 33% 97%;
  --foreground: 243 47% 20%;
  --card: 0 0% 100%;
  --card-foreground: 243 47% 20%;
  --popover: 0 0% 100%;
  --popover-foreground: 243 47% 20%;
  --primary: 239 84% 67%;
  --primary-foreground: 0 0% 100%;
  --secondary: 45 93% 47%;
  --secondary-foreground: 0 0% 100%;
  --muted: 226 71% 94%;
  --muted-foreground: 243 47% 35%;
  --accent: 45 93% 47%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 226 71% 94%;
  --input: 226 71% 94%;
  --ring: 239 84% 67%;
  --radius: 0.5rem;
}

[data-theme='comprint-crm'].dark {
  --background: 230 25% 5%;
  --foreground: 226 100% 94%;
  --card: 243 47% 20%;
  --card-foreground: 226 100% 94%;
  --popover: 243 47% 20%;
  --popover-foreground: 226 100% 94%;
  --primary: 234 89% 74%;
  --primary-foreground: 0 0% 100%;
  --secondary: 45 93% 54%;
  --secondary-foreground: 0 0% 0%;
  --muted: 243 64% 27%;
  --muted-foreground: 226 71% 80%;
  --accent: 45 93% 54%;
  --accent-foreground: 0 0% 0%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 243 64% 27%;
  --input: 243 64% 27%;
  --ring: 234 89% 74%;
}

/* ════════════════════════════════════════════════════════════
   Theme 3: Corporate Slate (Default comprint theme)
   ════════════════════════════════════════════════════════════ */
[data-theme='corporate-slate'] {
  --background: 210 17% 98%;
  --foreground: 215 28% 17%;
  --card: 0 0% 100%;
  --card-foreground: 215 28% 17%;
  --popover: 0 0% 100%;
  --popover-foreground: 215 28% 17%;
  --primary: 180 52% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 215 28% 17%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --accent-foreground: 215 28% 17%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 180 52% 35%;
  --radius: 0.5rem;
}

[data-theme='corporate-slate'].dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 96%;
  --card: 217 33% 17%;
  --card-foreground: 210 40% 96%;
  --popover: 217 33% 17%;
  --popover-foreground: 210 40% 96%;
  --primary: 180 52% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 217 19% 27%;
  --secondary-foreground: 210 40% 96%;
  --muted: 217 19% 27%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 19% 27%;
  --accent-foreground: 210 40% 96%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 217 19% 27%;
  --input: 217 19% 27%;
  --ring: 180 52% 35%;
}

/* ════════════════════════════════════════════════════════════
   Theme 4: Modern Minimalist (Teal + Indigo accent)
   ════════════════════════════════════════════════════════════ */
[data-theme='modern-minimalist'] {
  --background: 0 0% 98%;
  --foreground: 240 5.2% 16.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 5.2% 16.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 5.2% 16.9%;
  --primary: 180 52% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.2% 16.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 239 84% 67%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 180 52% 35%;
  --radius: 0.375rem;
}

[data-theme='modern-minimalist'].dark {
  --background: 240 5.9% 10%;
  --foreground: 240 4.8% 95.9%;
  --card: 240 5.2% 16.9%;
  --card-foreground: 240 4.8% 95.9%;
  --popover: 240 5.2% 16.9%;
  --popover-foreground: 240 4.8% 95.9%;
  --primary: 180 52% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 240 4.8% 95.9%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 234 89% 74%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 180 52% 35%;
}

/* ════════════════════════════════════════════════════════════
   Theme 5: High-Contrast Professional (Teal + Navy)
   ════════════════════════════════════════════════════════════ */
[data-theme='high-contrast'] {
  --background: 210 17% 98%;
  --foreground: 240 20% 14%;
  --card: 0 0% 100%;
  --card-foreground: 240 20% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 20% 14%;
  --primary: 180 52% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 93%;
  --secondary-foreground: 240 20% 14%;
  --muted: 210 20% 93%;
  --muted-foreground: 215 16% 37%;
  --accent: 160 84% 39%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 216 12% 84%;
  --input: 216 12% 84%;
  --ring: 180 52% 35%;
  --radius: 0.5rem;
  --header-bg: 240 20% 14%;
  --header-foreground: 210 40% 96%;
}

[data-theme='high-contrast'].dark {
  --background: 243 37% 9%;
  --foreground: 210 40% 96%;
  --card: 226 44% 16%;
  --card-foreground: 210 40% 96%;
  --popover: 226 44% 16%;
  --popover-foreground: 210 40% 96%;
  --primary: 180 52% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 230 30% 20%;
  --secondary-foreground: 210 40% 96%;
  --muted: 230 30% 20%;
  --muted-foreground: 215 20% 65%;
  --accent: 160 72% 52%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 230 30% 22%;
  --input: 230 30% 22%;
  --ring: 180 52% 35%;
  --header-bg: 243 37% 6%;
  --header-foreground: 210 40% 96%;
}

/* ════════════════════════════════════════════════════════════
   Theme 6: Ocean Blue (Enterprise SaaS)
   ════════════════════════════════════════════════════════════ */
[data-theme='ocean-blue'] {
  --background: 213 33% 96%;
  --foreground: 220 40% 20%;
  --card: 0 0% 100%;
  --card-foreground: 220 40% 20%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 40% 20%;
  --primary: 214 100% 42%;
  --primary-foreground: 0 0% 100%;
  --secondary: 197 100% 43%;
  --secondary-foreground: 0 0% 100%;
  --muted: 213 33% 93%;
  --muted-foreground: 220 20% 45%;
  --accent: 197 100% 43%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 213 25% 88%;
  --input: 213 25% 88%;
  --ring: 214 100% 42%;
  --radius: 0.5rem;
}

[data-theme='ocean-blue'].dark {
  --background: 213 55% 7%;
  --foreground: 213 33% 91%;
  --card: 220 40% 20%;
  --card-foreground: 213 33% 91%;
  --popover: 220 40% 20%;
  --popover-foreground: 213 33% 91%;
  --primary: 213 90% 63%;
  --primary-foreground: 0 0% 100%;
  --secondary: 197 78% 55%;
  --secondary-foreground: 0 0% 0%;
  --muted: 217 33% 22%;
  --muted-foreground: 213 25% 65%;
  --accent: 197 78% 55%;
  --accent-foreground: 0 0% 0%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 217 33% 22%;
  --input: 217 33% 22%;
  --ring: 213 90% 63%;
}

/* ════════════════════════════════════════════════════════════
   Theme 7: Forest Green (FinTech)
   ════════════════════════════════════════════════════════════ */
[data-theme='forest-green'] {
  --background: 120 11% 97%;
  --foreground: 120 25% 14%;
  --card: 0 0% 100%;
  --card-foreground: 120 25% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 120 25% 14%;
  --primary: 148 85% 27%;
  --primary-foreground: 0 0% 100%;
  --secondary: 120 11% 93%;
  --secondary-foreground: 120 25% 14%;
  --muted: 120 11% 93%;
  --muted-foreground: 120 10% 42%;
  --accent: 263 100% 64%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 120 14% 88%;
  --input: 120 14% 88%;
  --ring: 148 85% 27%;
  --radius: 0.5rem;
}

[data-theme='forest-green'].dark {
  --background: 152 40% 5%;
  --foreground: 120 11% 93%;
  --card: 150 30% 11%;
  --card-foreground: 120 11% 93%;
  --popover: 150 30% 11%;
  --popover-foreground: 120 11% 93%;
  --primary: 150 70% 50%;
  --primary-foreground: 0 0% 0%;
  --secondary: 148 25% 16%;
  --secondary-foreground: 120 11% 93%;
  --muted: 148 25% 16%;
  --muted-foreground: 120 10% 60%;
  --accent: 263 85% 71%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 148 25% 16%;
  --input: 148 25% 16%;
  --ring: 150 70% 50%;
}

/* ════════════════════════════════════════════════════════════
   Theme 8: Amber Warm (Manufacturing/Logistics)
   ════════════════════════════════════════════════════════════ */
[data-theme='amber-warm'] {
  --background: 30 17% 97%;
  --foreground: 20 14.3% 16.1%;
  --card: 0 0% 100%;
  --card-foreground: 20 14.3% 16.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 20 14.3% 16.1%;
  --primary: 38 92% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 30 17% 93%;
  --secondary-foreground: 20 14.3% 16.1%;
  --muted: 30 17% 93%;
  --muted-foreground: 25 5.3% 44.7%;
  --accent: 0 72.2% 50.6%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 24 10% 87%;
  --input: 24 10% 87%;
  --ring: 38 92% 50%;
  --radius: 0.5rem;
}

[data-theme='amber-warm'].dark {
  --background: 20 14.3% 10%;
  --foreground: 30 17% 95%;
  --card: 20 14.3% 16.1%;
  --card-foreground: 30 17% 95%;
  --popover: 20 14.3% 16.1%;
  --popover-foreground: 30 17% 95%;
  --primary: 43 96% 56%;
  --primary-foreground: 0 0% 0%;
  --secondary: 20 10% 20%;
  --secondary-foreground: 30 17% 95%;
  --muted: 20 10% 20%;
  --muted-foreground: 25 5.3% 60%;
  --accent: 0 72.2% 65%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 12 6.5% 25.1%;
  --input: 12 6.5% 25.1%;
  --ring: 43 96% 56%;
}
```

- [ ] **Step 2: Verify themes render by testing with data-theme attribute**

Temporarily update `index.html` body tag:

```html
<body data-theme="corporate-slate">
```

```bash
npm run dev
```

Expected: App renders with Corporate Slate colors.

Test dark mode by adding `dark` class:

```html
<body data-theme="corporate-slate" class="dark">
```

Expected: Dark background, light text.

Remove the `class="dark"` after testing (ThemeContext will manage this).

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add 8 themes with light/dark variants (16 combinations)"
```

---

## Task 5: Create Auth Types and Role Hierarchy

**Files:**
- Create: `src/types/auth.ts`
- Create: `src/constants/roles.ts`
- Create: `src/constants/mock-users.ts`

- [ ] **Step 1: Create auth types**

```typescript
// src/types/auth.ts

export const USER_ROLES = [
  'SUPERADMIN',
  'ADMIN',
  'PRODUCT_MANAGER',
  'SALES_MANAGER',
  'SALES_REP',
  'WAREHOUSE_MANAGER',
  'WAREHOUSE_EXECUTIVE',
  'INSPECTION_ENGINEER',
  'TECHNICAL_TEAM',
  'QC_ENGINEER',
  'PROCUREMENT_MANAGER',
  'PROCUREMENT_EXEC',
  'FINANCE_MANAGER',
  'FINANCE_EXEC',
  'RENTAL_MANAGER',
  'ECOMMERCE_ADMIN',
  'VIEWER',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

export interface Permission {
  module: string
  entity: string
  actions: PermissionAction[]
}

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  permissions: Permission[]
  assignedCategories?: string[]
}

export interface RoleConfig {
  role: UserRole
  label: string
  inherits?: UserRole[]
  crossModuleView?: string[]
  defaultDashboard: string
}
```

- [ ] **Step 2: Create role hierarchy config**

```typescript
// src/constants/roles.ts

import type { RoleConfig } from '@/types/auth'

export const ROLE_HIERARCHY: Record<string, RoleConfig> = {
  SUPERADMIN: {
    role: 'SUPERADMIN',
    label: 'Super Admin',
    inherits: ['ADMIN'],
    defaultDashboard: '/dashboard',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Admin',
    inherits: [
      'PRODUCT_MANAGER',
      'SALES_MANAGER',
      'WAREHOUSE_MANAGER',
      'PROCUREMENT_MANAGER',
      'FINANCE_MANAGER',
      'RENTAL_MANAGER',
      'ECOMMERCE_ADMIN',
    ],
    defaultDashboard: '/dashboard',
  },
  PRODUCT_MANAGER: {
    role: 'PRODUCT_MANAGER',
    label: 'Product Manager',
    crossModuleView: ['crm', 'procurement', 'ims'],
    defaultDashboard: '/crm',
  },
  SALES_MANAGER: {
    role: 'SALES_MANAGER',
    label: 'Sales Manager',
    inherits: ['SALES_REP'],
    crossModuleView: ['ims'],
    defaultDashboard: '/crm',
  },
  SALES_REP: {
    role: 'SALES_REP',
    label: 'Sales Representative',
    defaultDashboard: '/crm',
  },
  WAREHOUSE_MANAGER: {
    role: 'WAREHOUSE_MANAGER',
    label: 'Warehouse Manager',
    inherits: ['WAREHOUSE_EXECUTIVE', 'INSPECTION_ENGINEER', 'TECHNICAL_TEAM', 'QC_ENGINEER'],
    crossModuleView: ['procurement'],
    defaultDashboard: '/wms',
  },
  WAREHOUSE_EXECUTIVE: {
    role: 'WAREHOUSE_EXECUTIVE',
    label: 'Warehouse Executive',
    defaultDashboard: '/wms',
  },
  INSPECTION_ENGINEER: {
    role: 'INSPECTION_ENGINEER',
    label: 'Inspection Engineer',
    defaultDashboard: '/wms',
  },
  TECHNICAL_TEAM: {
    role: 'TECHNICAL_TEAM',
    label: 'Technical Team',
    defaultDashboard: '/wms',
  },
  QC_ENGINEER: {
    role: 'QC_ENGINEER',
    label: 'QC Engineer',
    defaultDashboard: '/wms',
  },
  PROCUREMENT_MANAGER: {
    role: 'PROCUREMENT_MANAGER',
    label: 'Procurement Manager',
    inherits: ['PROCUREMENT_EXEC'],
    crossModuleView: ['ims'],
    defaultDashboard: '/procurement',
  },
  PROCUREMENT_EXEC: {
    role: 'PROCUREMENT_EXEC',
    label: 'Procurement Executive',
    defaultDashboard: '/procurement',
  },
  FINANCE_MANAGER: {
    role: 'FINANCE_MANAGER',
    label: 'Finance Manager',
    inherits: ['FINANCE_EXEC'],
    crossModuleView: ['crm', 'procurement', 'wms', 'ims', 'rentals'],
    defaultDashboard: '/accounting',
  },
  FINANCE_EXEC: {
    role: 'FINANCE_EXEC',
    label: 'Finance Executive',
    defaultDashboard: '/accounting',
  },
  RENTAL_MANAGER: {
    role: 'RENTAL_MANAGER',
    label: 'Rental Manager',
    crossModuleView: ['ims', 'customers'],
    defaultDashboard: '/rentals',
  },
  ECOMMERCE_ADMIN: {
    role: 'ECOMMERCE_ADMIN',
    label: 'E-commerce Admin',
    crossModuleView: ['ims'],
    defaultDashboard: '/ecommerce',
  },
  VIEWER: {
    role: 'VIEWER',
    label: 'Viewer',
    defaultDashboard: '/reports',
  },
}

/**
 * Check if a role has access (direct or inherited) to a target role's permissions.
 */
export function hasRoleAccess(userRole: string, targetRole: string): boolean {
  if (userRole === targetRole) return true
  const config = ROLE_HIERARCHY[userRole]
  if (!config?.inherits) return false
  return config.inherits.some(
    (inherited) => inherited === targetRole || hasRoleAccess(inherited, targetRole)
  )
}

/**
 * Check if a role has cross-module view access to a module.
 */
export function hasCrossModuleView(userRole: string, module: string): boolean {
  const config = ROLE_HIERARCHY[userRole]
  if (!config) return false
  if (config.crossModuleView?.includes(module)) return true
  if (config.inherits) {
    return config.inherits.some((inherited) => hasCrossModuleView(inherited, module))
  }
  return false
}
```

- [ ] **Step 3: Create mock users**

```typescript
// src/constants/mock-users.ts

import type { User } from '@/types/auth'

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Amar Daxini',
    email: 'amar@comprinttech.com',
    avatar: '',
    role: 'SUPERADMIN',
    permissions: [],
  },
  {
    id: '2',
    name: 'Priya Sharma',
    email: 'priya@comprinttech.com',
    avatar: '',
    role: 'ADMIN',
    permissions: [],
  },
  {
    id: '3',
    name: 'Rahul Mehta',
    email: 'rahul@comprinttech.com',
    avatar: '',
    role: 'PRODUCT_MANAGER',
    permissions: [],
    assignedCategories: ['servers', 'storage'],
  },
  {
    id: '4',
    name: 'Sneha Patel',
    email: 'sneha@comprinttech.com',
    avatar: '',
    role: 'SALES_MANAGER',
    permissions: [],
  },
  {
    id: '5',
    name: 'Vikram Singh',
    email: 'vikram@comprinttech.com',
    avatar: '',
    role: 'WAREHOUSE_MANAGER',
    permissions: [],
  },
  {
    id: '6',
    name: 'Anita Desai',
    email: 'anita@comprinttech.com',
    avatar: '',
    role: 'TECHNICAL_TEAM',
    permissions: [],
  },
  {
    id: '7',
    name: 'Kiran Joshi',
    email: 'kiran@comprinttech.com',
    avatar: '',
    role: 'FINANCE_MANAGER',
    permissions: [],
  },
  {
    id: '8',
    name: 'Deepak Kumar',
    email: 'deepak@comprinttech.com',
    avatar: '',
    role: 'VIEWER',
    permissions: [],
  },
]
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add auth types, role hierarchy with inheritance, and mock users"
```

---

## Task 6: Create AuthContext

**Files:**
- Create: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Implement AuthContext**

```typescript
// src/contexts/AuthContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, UserRole, PermissionAction } from '@/types/auth'
import { ROLE_HIERARCHY, hasRoleAccess, hasCrossModuleView } from '@/constants/roles'
import { MOCK_USERS } from '@/constants/mock-users'

interface AuthContextValue {
  user: User
  switchUser: (userId: string) => void
  switchRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  hasPermission: (module: string, entity: string, action: PermissionAction) => boolean
  hasModuleAccess: (module: string) => boolean
  getDefaultDashboard: () => string
  allUsers: User[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(MOCK_USERS[0])

  const switchUser = useCallback((userId: string) => {
    const found = MOCK_USERS.find((u) => u.id === userId)
    if (found) setUser(found)
  }, [])

  const switchRole = useCallback((role: UserRole) => {
    setUser((prev) => ({ ...prev, role }))
  }, [])

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return hasRoleAccess(user.role, role)
    },
    [user.role]
  )

  const hasPermission = useCallback(
    (module: string, entity: string, action: PermissionAction): boolean => {
      // SUPERADMIN and ADMIN have all permissions
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true

      // Check direct permissions
      const perm = user.permissions.find(
        (p) => p.module === module && p.entity === entity
      )
      if (perm?.actions.includes(action)) return true

      // Check inherited role permissions
      const config = ROLE_HIERARCHY[user.role]
      if (config?.inherits) {
        // Inherited roles grant full access to their modules
        return false // Simplified — expand when real permissions come in
      }

      // Cross-module view access is read-only
      if (action === 'view' && hasCrossModuleView(user.role, module)) {
        return true
      }

      return false
    },
    [user]
  )

  const hasModuleAccess = useCallback(
    (module: string): boolean => {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') return true
      if (user.role === 'VIEWER') return true // read-only everywhere

      // Direct module mapping
      const roleModules: Record<string, string[]> = {
        PRODUCT_MANAGER: ['crm', 'procurement', 'ims'],
        SALES_MANAGER: ['crm', 'invoices', 'reports'],
        SALES_REP: ['crm'],
        WAREHOUSE_MANAGER: ['wms', 'ims', 'reports'],
        WAREHOUSE_EXECUTIVE: ['wms'],
        INSPECTION_ENGINEER: ['wms'],
        TECHNICAL_TEAM: ['wms', 'ims'],
        QC_ENGINEER: ['wms'],
        PROCUREMENT_MANAGER: ['procurement', 'purchase-orders', 'vendors'],
        PROCUREMENT_EXEC: ['procurement'],
        FINANCE_MANAGER: ['accounting', 'invoices', 'reconciliation', 'reports'],
        FINANCE_EXEC: ['accounting', 'invoices'],
        RENTAL_MANAGER: ['rentals', 'ims', 'customers'],
        ECOMMERCE_ADMIN: ['ecommerce', 'ims'],
      }

      const directModules = roleModules[user.role] ?? []
      if (directModules.includes(module)) return true

      // Cross-module view
      return hasCrossModuleView(user.role, module)
    },
    [user.role]
  )

  const getDefaultDashboard = useCallback((): string => {
    return ROLE_HIERARCHY[user.role]?.defaultDashboard ?? '/dashboard'
  }, [user.role])

  return (
    <AuthContext.Provider
      value={{
        user,
        switchUser,
        switchRole,
        hasRole,
        hasPermission,
        hasModuleAccess,
        getDefaultDashboard,
        allUsers: MOCK_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: implement AuthContext with role hierarchy and permission checks"
```

---

## Task 7: Create ThemeContext

**Files:**
- Create: `src/contexts/ThemeContext.tsx`

- [ ] **Step 1: Implement ThemeContext**

```typescript
// src/contexts/ThemeContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export const THEMES = [
  { id: 'shadcn-default', label: 'Shadcn Default' },
  { id: 'comprint-crm', label: 'Comprint CRM' },
  { id: 'corporate-slate', label: 'Corporate Slate' },
  { id: 'modern-minimalist', label: 'Modern Minimalist' },
  { id: 'high-contrast', label: 'High-Contrast Professional' },
  { id: 'ocean-blue', label: 'Ocean Blue' },
  { id: 'forest-green', label: 'Forest Green' },
  { id: 'amber-warm', label: 'Amber Warm' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type ColorMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: ThemeId
  colorMode: ColorMode
  isDark: boolean
  setTheme: (theme: ThemeId) => void
  setColorMode: (mode: ColorMode) => void
  themes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY_THEME = 'comprint-theme'
const STORAGE_KEY_MODE = 'comprint-color-mode'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_THEME)
    return (stored as ThemeId) || 'corporate-slate'
  })

  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_MODE)
    return (stored as ColorMode) || 'light'
  })

  const [systemDark, setSystemDark] = useState(getSystemDark)

  const isDark = colorMode === 'dark' || (colorMode === 'system' && systemDark)

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme, isDark])

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY_THEME, newTheme)
  }, [])

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode)
    localStorage.setItem(STORAGE_KEY_MODE, mode)
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, colorMode, isDark, setTheme, setColorMode, themes: THEMES }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: implement ThemeContext with 8 themes, light/dark/system modes, and localStorage persistence"
```

---

## Task 8: Create SidebarContext

**Files:**
- Create: `src/contexts/SidebarContext.tsx`

- [ ] **Step 1: Implement SidebarContext**

```typescript
// src/contexts/SidebarContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface SidebarContextValue {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'comprint-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })
  const [isMobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: implement SidebarContext with collapse state and mobile drawer"
```

---

## Task 9: Create PermissionGate Component

**Files:**
- Create: `src/components/common/PermissionGate.tsx`

- [ ] **Step 1: Implement PermissionGate**

```typescript
// src/components/common/PermissionGate.tsx

import type { ReactNode } from 'react'
import type { UserRole, PermissionAction } from '@/types/auth'
import { useAuth } from '@/contexts/AuthContext'

interface PermissionGateProps {
  children: ReactNode
  /** Require user to have this role (direct or inherited) */
  role?: UserRole
  /** Require user to have this specific permission */
  permission?: {
    module: string
    entity: string
    action: PermissionAction
  }
  /** Require user's assignedCategories to include at least one of these */
  categoryScope?: string[]
  /** Rendered when access is denied. Default: render nothing */
  fallback?: ReactNode
}

export function PermissionGate({
  children,
  role,
  permission,
  categoryScope,
  fallback = null,
}: PermissionGateProps) {
  const { hasRole, hasPermission, user } = useAuth()

  // Check role requirement
  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  // Check permission requirement
  if (permission && !hasPermission(permission.module, permission.entity, permission.action)) {
    return <>{fallback}</>
  }

  // Check category scope
  if (categoryScope && categoryScope.length > 0) {
    const userCategories = user.assignedCategories ?? []
    const hasCategory = categoryScope.some((cat) => userCategories.includes(cat))
    if (!hasCategory && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: implement PermissionGate component with role, permission, and category checks"
```

---

## Task 10: Create Navigation Config

**Files:**
- Create: `src/types/navigation.ts`
- Create: `src/components/layout/sidebar-nav-config.ts`

- [ ] **Step 1: Create navigation types**

```typescript
// src/types/navigation.ts

import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Module this item belongs to — used for PermissionGate */
  module?: string
  /** Specific role required to see this item */
  requiredRole?: string
}

export interface NavGroup {
  label: string
  module: string
  icon: LucideIcon
  items: NavItem[]
}
```

- [ ] **Step 2: Create sidebar navigation config**

```typescript
// src/components/layout/sidebar-nav-config.ts

import {
  LayoutDashboard,
  Users,
  Handshake,
  Building2,
  Contact,
  ShoppingCart,
  FileText,
  Receipt,
  Warehouse,
  PackageSearch,
  ClipboardCheck,
  Wrench,
  Paintbrush,
  CheckCircle2,
  Truck,
  Package,
  Boxes,
  FolderTree,
  Tags,
  BarChart3,
  FilePlus,
  FileCheck,
  Store,
  ClipboardList,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  Globe,
  ShoppingBag,
  ListOrdered,
  UserPlus,
  Shield,
  Settings,
  UserCircle,
  Scale,
  CalendarClock,
  FileBox,
  RotateCcw,
  MapPin,
} from 'lucide-react'
import type { NavGroup } from '@/types/navigation'

export const SIDEBAR_NAV: NavGroup[] = [
  {
    label: 'CRM',
    module: 'crm',
    icon: Users,
    items: [
      { label: 'Dashboard', href: '/crm', icon: LayoutDashboard, module: 'crm' },
      { label: 'Leads', href: '/crm/leads', icon: Users, module: 'crm' },
      { label: 'Deals', href: '/crm/deals', icon: Handshake, module: 'crm' },
      { label: 'Accounts', href: '/crm/accounts', icon: Building2, module: 'crm' },
      { label: 'Contacts', href: '/crm/contacts', icon: Contact, module: 'crm' },
      { label: 'Sales Orders', href: '/crm/sales-orders', icon: ShoppingCart, module: 'crm' },
      { label: 'Quotes', href: '/crm/quotes', icon: FileText, module: 'crm' },
    ],
  },
  {
    label: 'Warehouse',
    module: 'wms',
    icon: Warehouse,
    items: [
      { label: 'Dashboard', href: '/wms', icon: LayoutDashboard, module: 'wms' },
      { label: 'Inward / GRN', href: '/wms/inward', icon: PackageSearch, module: 'wms' },
      { label: 'Inspection', href: '/wms/inspection', icon: ClipboardCheck, module: 'wms' },
      { label: 'Repair', href: '/wms/repair', icon: Wrench, module: 'wms' },
      { label: 'Paint', href: '/wms/paint', icon: Paintbrush, module: 'wms' },
      { label: 'QC', href: '/wms/qc', icon: CheckCircle2, module: 'wms' },
      { label: 'Outward', href: '/wms/outward', icon: Truck, module: 'wms' },
      { label: 'Dispatch', href: '/wms/dispatch', icon: Package, module: 'wms' },
    ],
  },
  {
    label: 'Inventory',
    module: 'ims',
    icon: Boxes,
    items: [
      { label: 'Dashboard', href: '/ims', icon: LayoutDashboard, module: 'ims' },
      { label: 'Inventory', href: '/ims/inventory', icon: Boxes, module: 'ims' },
      { label: 'Categories', href: '/ims/categories', icon: FolderTree, module: 'ims' },
      { label: 'Stock Items', href: '/ims/stock-items', icon: Tags, module: 'ims' },
      { label: 'Reports', href: '/ims/reports', icon: BarChart3, module: 'ims' },
    ],
  },
  {
    label: 'Procurement',
    module: 'procurement',
    icon: ClipboardList,
    items: [
      { label: 'Dashboard', href: '/procurement', icon: LayoutDashboard, module: 'procurement' },
      { label: 'Purchase Requests', href: '/procurement/pr', icon: FilePlus, module: 'procurement' },
      { label: 'Approvals', href: '/procurement/approvals', icon: FileCheck, module: 'procurement' },
    ],
  },
  {
    label: 'Purchase Orders',
    module: 'purchase-orders',
    icon: FileText,
    items: [
      { label: 'Dashboard', href: '/purchase-orders', icon: LayoutDashboard, module: 'purchase-orders' },
      { label: 'PO List', href: '/purchase-orders/list', icon: FileText, module: 'purchase-orders' },
      { label: 'GRN Matching', href: '/purchase-orders/grn-matching', icon: ArrowLeftRight, module: 'purchase-orders' },
    ],
  },
  {
    label: 'Invoices',
    module: 'invoices',
    icon: Receipt,
    items: [
      { label: 'Dashboard', href: '/invoices', icon: LayoutDashboard, module: 'invoices' },
      { label: 'Sales Invoices', href: '/invoices/sales', icon: Receipt, module: 'invoices' },
      { label: 'Purchase Invoices', href: '/invoices/purchase', icon: FileText, module: 'invoices' },
      { label: 'Credit Notes', href: '/invoices/credit-notes', icon: FileBox, module: 'invoices' },
    ],
  },
  {
    label: 'Accounting',
    module: 'accounting',
    icon: Landmark,
    items: [
      { label: 'Dashboard', href: '/accounting', icon: LayoutDashboard, module: 'accounting' },
      { label: 'Ledger', href: '/accounting/ledger', icon: Landmark, module: 'accounting' },
      { label: 'Payments', href: '/accounting/payments', icon: CreditCard, module: 'accounting' },
      { label: 'Reports', href: '/accounting/reports', icon: BarChart3, module: 'accounting' },
    ],
  },
  {
    label: 'Reconciliation',
    module: 'reconciliation',
    icon: Scale,
    items: [
      { label: 'Bank', href: '/reconciliation/bank', icon: Landmark, module: 'reconciliation' },
      { label: 'Vendor', href: '/reconciliation/vendor', icon: Store, module: 'reconciliation' },
      { label: 'Inventory', href: '/reconciliation/inventory', icon: Boxes, module: 'reconciliation' },
      { label: 'Inter-module', href: '/reconciliation/inter-module', icon: ArrowLeftRight, module: 'reconciliation' },
    ],
  },
  {
    label: 'E-commerce',
    module: 'ecommerce',
    icon: Globe,
    items: [
      { label: 'Dashboard', href: '/ecommerce', icon: LayoutDashboard, module: 'ecommerce' },
      { label: 'Catalog', href: '/ecommerce/catalog', icon: ShoppingBag, module: 'ecommerce' },
      { label: 'Products', href: '/ecommerce/products', icon: Tags, module: 'ecommerce' },
      { label: 'Orders', href: '/ecommerce/orders', icon: ListOrdered, module: 'ecommerce' },
    ],
  },
  {
    label: 'Vendors',
    module: 'vendors',
    icon: Store,
    items: [
      { label: 'Vendor List', href: '/vendors', icon: Store, module: 'vendors' },
      { label: 'Approvals', href: '/vendors/approvals', icon: FileCheck, module: 'vendors' },
    ],
  },
  {
    label: 'Customers',
    module: 'customers',
    icon: UserPlus,
    items: [
      { label: 'Customer List', href: '/customers', icon: UserPlus, module: 'customers' },
      { label: 'Approvals', href: '/customers/approvals', icon: FileCheck, module: 'customers' },
    ],
  },
  {
    label: 'Rentals',
    module: 'rentals',
    icon: CalendarClock,
    items: [
      { label: 'Dashboard', href: '/rentals', icon: LayoutDashboard, module: 'rentals' },
      { label: 'Contracts', href: '/rentals/contracts', icon: FileText, module: 'rentals' },
      { label: 'Device Tracking', href: '/rentals/tracking', icon: MapPin, module: 'rentals' },
      { label: 'Returns', href: '/rentals/returns', icon: RotateCcw, module: 'rentals' },
    ],
  },
  {
    label: 'Reports',
    module: 'reports',
    icon: BarChart3,
    items: [
      { label: 'Report Builder', href: '/reports', icon: BarChart3, module: 'reports' },
    ],
  },
  {
    label: 'Settings',
    module: 'settings',
    icon: Settings,
    items: [
      { label: 'Profile', href: '/settings/profile', icon: UserCircle, module: 'settings' },
      { label: 'User Management', href: '/settings/users', icon: Users, module: 'settings', requiredRole: 'ADMIN' },
      { label: 'Roles & Permissions', href: '/settings/roles', icon: Shield, module: 'settings', requiredRole: 'ADMIN' },
      { label: 'App Settings', href: '/settings/app', icon: Settings, module: 'settings' },
    ],
  },
]
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add navigation types and sidebar nav config for all 14 modules"
```

---

## Task 11: Build Sidebar Component

**Files:**
- Create: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Implement Sidebar**

```typescript
// src/components/layout/Sidebar.tsx

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { SIDEBAR_NAV } from './sidebar-nav-config'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { NavGroup } from '@/types/navigation'

function NavGroupItem({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const location = useLocation()
  const { hasModuleAccess, hasRole } = useAuth()
  const [isOpen, setIsOpen] = useState(true)

  // Hide entire group if user has no module access
  if (!hasModuleAccess(group.module)) return null

  // Filter items by requiredRole
  const visibleItems = group.items.filter((item) => {
    if (item.requiredRole) return hasRole(item.requiredRole as never)
    return true
  })

  if (visibleItems.length === 0) return null

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={visibleItems[0].href}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg mx-auto mb-1',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                location.pathname.startsWith(`/${group.module}`) &&
                  'bg-primary/10 text-primary border-l-2 border-primary'
              )}
            >
              <group.icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <p className="font-semibold">{group.label}</p>
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'text-sm hover:text-primary',
                  location.pathname === item.href && 'text-primary font-medium'
                )}
              >
                {item.label}
              </Link>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <group.icon className="h-4 w-4" />
          {group.label}
        </span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', !isOpen && '-rotate-90')}
        />
      </button>
      {isOpen && (
        <div className="ml-2 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-accent',
                  isActive && 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  return (
    <ScrollArea className="h-full py-2">
      <nav className="space-y-1 px-2">
        {/* Dashboard link — always visible */}
        <Link
          to="/dashboard"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center justify-center w-10 h-10 rounded-lg">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                    </svg>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">Dashboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
              </svg>
              Dashboard
            </>
          )}
        </Link>

        <div className="my-2 border-t border-border" />

        {SIDEBAR_NAV.map((group) => (
          <NavGroupItem key={group.module} group={group} collapsed={collapsed} />
        ))}
      </nav>
    </ScrollArea>
  )
}

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen } = useSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col sticky top-16 h-[calc(100vh-4rem)] z-40',
          'bg-card border-r border-border transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex items-center justify-end p-2 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <span className="text-primary font-sans font-bold text-lg">comprint</span>
            <span className="font-serif font-bold text-lg">tech</span>
          </div>
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: build collapsible sidebar with grouped nav, RBAC filtering, and mobile drawer"
```

---

## Task 12: Build Header Components

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/ThemeSwitcher.tsx`
- Create: `src/components/layout/UserMenu.tsx`
- Create: `src/components/layout/DevRoleSwitcher.tsx`
- Create: `src/components/layout/NotificationPopover.tsx`
- Create: `src/components/layout/GlobalSearch.tsx`

- [ ] **Step 1: Create ThemeSwitcher**

```typescript
// src/components/layout/ThemeSwitcher.tsx

import { Palette, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type ColorMode } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeSwitcher() {
  const { theme, colorMode, setTheme, setColorMode, themes } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(theme === t.id && 'bg-accent')}
          >
            <span className="flex-1">{t.label}</span>
            {theme === t.id && <span className="text-primary">&#10003;</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {COLOR_MODE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setColorMode(opt.value)}
            className={cn(colorMode === opt.value && 'bg-accent')}
          >
            <opt.icon className="h-4 w-4 mr-2" />
            <span className="flex-1">{opt.label}</span>
            {colorMode === opt.value && <span className="text-primary">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Create UserMenu**

```typescript
// src/components/layout/UserMenu.tsx

import { LogOut, User, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_HIERARCHY } from '@/constants/roles'

export function UserMenu() {
  const { user } = useAuth()
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel = ROLE_HIERARCHY[user.role]?.label ?? user.role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-sm font-medium">{user.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {roleLabel}
            </Badge>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings/profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings/app">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: Create DevRoleSwitcher**

```typescript
// src/components/layout/DevRoleSwitcher.tsx

import { Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ROLE_HIERARCHY } from '@/constants/roles'

export function DevRoleSwitcher() {
  const { user, switchUser, allUsers } = useAuth()

  // Only show in development
  if (import.meta.env.PROD) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-orange-500">
          <Bug className="h-4 w-4" />
          <span className="sr-only">Switch role (dev)</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-orange-500">
          Dev: Switch User / Role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allUsers.map((u) => (
          <DropdownMenuItem
            key={u.id}
            onClick={() => switchUser(u.id)}
            className={cn(user.id === u.id && 'bg-accent')}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_HIERARCHY[u.role]?.label ?? u.role}
              </p>
            </div>
            {user.id === u.id && <span className="text-primary">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Create NotificationPopover**

```typescript
// src/components/layout/NotificationPopover.tsx

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  module: string
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'New PO #1234 approved',
    description: 'Purchase order for Server Rack has been approved by Finance.',
    time: '2 min ago',
    read: false,
    module: 'procurement',
  },
  {
    id: '2',
    title: 'QC Failed — Device #5678',
    description: 'Device failed quality check. Rework required.',
    time: '15 min ago',
    read: false,
    module: 'wms',
  },
  {
    id: '3',
    title: 'Lead "Acme Corp" moved to Won',
    description: 'Deal closed at $45,000. Invoice pending.',
    time: '1 hour ago',
    read: false,
    module: 'crm',
  },
  {
    id: '4',
    title: 'Low stock alert: SSD 1TB',
    description: 'Stock level below threshold (5 units remaining).',
    time: '3 hours ago',
    read: true,
    module: 'ims',
  },
  {
    id: '5',
    title: 'Rental contract expiring',
    description: 'Contract #RC-2024-089 expires in 3 days.',
    time: '5 hours ago',
    read: true,
    module: 'rentals',
  },
]

export function NotificationPopover() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length
  const filtered =
    filter === 'unread' ? MOCK_NOTIFICATIONS.filter((n) => !n.read) : MOCK_NOTIFICATIONS

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm font-sans">Notifications</h4>
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>
        </div>
        <ScrollArea className="h-80">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No notifications
            </p>
          ) : (
            filtered.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'flex gap-3 p-3 border-b border-border hover:bg-accent cursor-pointer',
                  !notification.read && 'bg-primary/5'
                )}
              >
                {!notification.read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
                <div className={cn('flex-1 min-w-0', notification.read && 'ml-5')}>
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-xs text-primary">
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 5: Create GlobalSearch**

```typescript
// src/components/layout/GlobalSearch.tsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  label: string
  href: string
  module: string
}

const MOCK_SEARCH_ITEMS: SearchResult[] = [
  { id: '1', label: 'CRM Dashboard', href: '/crm', module: 'CRM' },
  { id: '2', label: 'Leads', href: '/crm/leads', module: 'CRM' },
  { id: '3', label: 'Deals', href: '/crm/deals', module: 'CRM' },
  { id: '4', label: 'Accounts', href: '/crm/accounts', module: 'CRM' },
  { id: '5', label: 'WMS Dashboard', href: '/wms', module: 'Warehouse' },
  { id: '6', label: 'Inspection', href: '/wms/inspection', module: 'Warehouse' },
  { id: '7', label: 'Inventory', href: '/ims/inventory', module: 'Inventory' },
  { id: '8', label: 'Stock Items', href: '/ims/stock-items', module: 'Inventory' },
  { id: '9', label: 'Purchase Requests', href: '/procurement/pr', module: 'Procurement' },
  { id: '10', label: 'Invoices', href: '/invoices', module: 'Invoices' },
  { id: '11', label: 'Ledger', href: '/accounting/ledger', module: 'Accounting' },
  { id: '12', label: 'Vendors', href: '/vendors', module: 'Vendors' },
  { id: '13', label: 'Customers', href: '/customers', module: 'Customers' },
  { id: '14', label: 'Rental Contracts', href: '/rentals/contracts', module: 'Rentals' },
  { id: '15', label: 'Reports', href: '/reports', module: 'Reports' },
  { id: '16', label: 'User Management', href: '/settings/users', module: 'Settings' },
]

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  // Group items by module
  const groups = MOCK_SEARCH_ITEMS.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.module]) acc[item.module] = []
    acc[item.module].push(item)
    return acc
  }, {})

  return (
    <>
      <Button
        variant="outline"
        className="h-9 w-9 md:w-64 md:justify-start md:px-3 gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline text-sm">Search...</span>
        <kbd className="hidden md:inline-flex ml-auto pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search modules, pages, entities..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groups).map(([module, items]) => (
            <CommandGroup key={module} heading={module}>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item.href)}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

- [ ] **Step 6: Create Header**

```typescript
// src/components/layout/Header.tsx

import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/contexts/SidebarContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationPopover } from './NotificationPopover'
import { ThemeSwitcher } from './ThemeSwitcher'
import { UserMenu } from './UserMenu'
import { DevRoleSwitcher } from './DevRoleSwitcher'

export function Header() {
  const { setMobileOpen } = useSidebar()

  return (
    <header className="sticky top-0 z-50 h-16 bg-card border-b border-border flex items-center px-4 gap-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-0.5 shrink-0">
        <span className="text-primary font-sans font-bold text-xl">comprint</span>
        <span className="font-serif font-bold text-xl text-foreground">tech</span>
      </Link>

      {/* Center nav links */}
      <nav className="hidden lg:flex items-center gap-1 ml-8">
        <Link
          to="/dashboard"
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
        >
          Dashboard
        </Link>
        <Link
          to="/reports"
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
        >
          Reports
        </Link>
        <Link
          to="/calendar"
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
        >
          Calendar
        </Link>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-1">
        <GlobalSearch />
        <NotificationPopover />
        <ThemeSwitcher />
        <DevRoleSwitcher />
        <UserMenu />
      </div>
    </header>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: build Header with GlobalSearch, NotificationPopover, ThemeSwitcher, UserMenu, and DevRoleSwitcher"
```

---

## Task 13: Build AppShell and FloatingQueryButton

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/FloatingQueryButton.tsx`
- Create: `src/hooks/use-scroll-position.ts`

- [ ] **Step 1: Create scroll position hook**

```typescript
// src/hooks/use-scroll-position.ts

import { useState, useEffect } from 'react'

export function useScrollPosition(threshold = 0) {
  const [isPastThreshold, setIsPastThreshold] = useState(false)

  useEffect(() => {
    const target = threshold || window.innerHeight

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPastThreshold(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    // Create sentinel element
    const sentinel = document.createElement('div')
    sentinel.style.position = 'absolute'
    sentinel.style.top = `${target}px`
    sentinel.style.height = '1px'
    sentinel.style.width = '1px'
    sentinel.style.pointerEvents = 'none'
    document.body.appendChild(sentinel)

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      sentinel.remove()
    }
  }, [threshold])

  return isPastThreshold
}
```

- [ ] **Step 2: Create FloatingQueryButton**

```typescript
// src/components/layout/FloatingQueryButton.tsx

import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollPosition } from '@/hooks/use-scroll-position'
import { cn } from '@/lib/utils'

export function FloatingQueryButton() {
  const isVisible = useScrollPosition()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-60 h-12 w-12 rounded-full shadow-lg',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'transition-all duration-300',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <ArrowUp className="h-5 w-5" />
      <span className="sr-only">Scroll to top</span>
    </Button>
  )
}
```

- [ ] **Step 3: Create AppShell**

```typescript
// src/components/layout/AppShell.tsx

import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { FloatingQueryButton } from './FloatingQueryButton'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </div>
      <FloatingQueryButton />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: build AppShell layout with FloatingQueryButton and scroll detection"
```

---

## Task 14: Set Up Router and Providers

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/app/providers.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/main.tsx`
- Create: `src/modules/dashboard/DashboardPage.tsx` (placeholder)

- [ ] **Step 1: Create placeholder DashboardPage**

```typescript
// src/modules/dashboard/DashboardPage.tsx

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome to comprinttech. Select a module from the sidebar to get started.
        </p>
      </div>

      {/* Placeholder content to test scrolling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-card border border-border p-4 flex flex-col justify-between"
          >
            <p className="text-sm text-muted-foreground">Metric {i + 1}</p>
            <p className="text-2xl font-bold font-sans">--</p>
          </div>
        ))}
      </div>

      {/* Spacer to enable scroll testing */}
      <div className="h-[200vh]" />
    </div>
  )
}
```

- [ ] **Step 2: Create router**

```typescript
// src/app/router.tsx

import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from '@/modules/dashboard/DashboardPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <DashboardPage />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      // Module routes will be added in subsequent phases
      // Each module uses lazy loading:
      // { path: '/crm/*', lazy: () => import('@/modules/crm/routes') },
    ],
  },
])
```

- [ ] **Step 3: Create providers**

```typescript
// src/app/providers.tsx

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Update App.tsx**

```typescript
// src/app/App.tsx

import { RouterProvider } from 'react-router-dom'
import { Providers } from './providers'
import { router } from './router'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </Providers>
  )
}
```

- [ ] **Step 5: Update main.tsx**

```typescript
// src/main.tsx

import './styles/index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'

// Stale chunk recovery
window.addEventListener('error', (e) => {
  if (
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('Loading chunk')
  ) {
    const reloaded = sessionStorage.getItem('chunk-reload')
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1')
      window.location.reload()
    }
  }
})

sessionStorage.removeItem('chunk-reload')

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Verify the full shell**

```bash
npm run dev
```

Expected:
- Sticky header with logo, nav links, search, notifications, theme switcher, user avatar
- Collapsible sidebar with grouped navigation filtered by role
- Dashboard placeholder page
- Theme switching works (try different themes via the dropdown)
- Light/dark mode toggles correctly
- Dev role switcher changes sidebar visibility
- Floating query button appears on scroll
- Mobile responsive: sidebar becomes drawer
- Global search opens with Cmd+K

- [ ] **Step 7: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: wire up router, providers, and AppShell — complete Phase 1 foundation"
```

---

## Summary

Phase 1 delivers:
- Vite + React 19 + TypeScript project
- Tailwind CSS with comprint design system (colors, typography, status utilities)
- Shadcn UI with ~30 base components installed
- 8 themes x light/dark (16 combinations) with CSS variables
- Application shell: sticky Header, collapsible Sidebar, FloatingQueryButton
- Header: Logo, nav links, GlobalSearch (Cmd+K), Notifications, ThemeSwitcher, UserMenu, DevRoleSwitcher
- Sidebar: grouped navigation for 14 modules with RBAC filtering
- AuthContext with 17 roles, hierarchy, and inheritance
- ThemeContext with localStorage persistence
- SidebarContext with collapse/mobile state
- PermissionGate component
- React Router with AppShell layout

**Next:** Phase 2 will build the core shared components (BusinessMetricsTable, KanbanBoard, WorkflowStepper, MultiStepWizard, etc.)
