import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import storybook from 'eslint-plugin-storybook'
import unusedImports from 'eslint-plugin-unused-imports'
import i18next from 'eslint-plugin-i18next'

// Shared `no-restricted-syntax` selectors for the design-system rules
// (typography §8.4 + arbitrary `[#hex]` colours). Defined once and spread into
// every block that needs them, because ESLint flat config does NOT merge
// multiple `no-restricted-syntax` entries across config objects — a later
// block's value REPLACES an earlier one wholesale. Spreading lets the
// page-scoped block below add the layout rule without dropping these.
const designSyntaxRules = [
  // (A) typography — raw <h1>–<h6>
  {
    selector: 'JSXOpeningElement[name.name=/^h[1-6]$/]',
    message:
      'Coding-guideline §8.4: use <Typography variant="page-title|section-title|subsection-title|card-title|…"> from @/components/ui/typography instead of raw <h1>–<h6>.',
  },
  // (A) typography — inline text-size classes
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/(^|\\s)text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|\\[\\d+(\\.\\d+)?(px|rem)\\])(\\s|$)/]",
    message:
      'Coding-guideline §8.4: replace inline text-size classes with <Typography variant=…>. Arbitrary text-[Npx] and the text-xs…text-6xl scale are not allowed in feature code.',
  },
  {
    selector:
      "JSXAttribute[name.name='className'] TemplateElement[value.raw=/(^|\\s)text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|\\[\\d+(\\.\\d+)?(px|rem)\\])(\\s|$)/]",
    message:
      'Coding-guideline §8.4: replace inline text-size classes with <Typography variant=…>. Arbitrary text-[Npx] and the text-xs…text-6xl scale are not allowed in feature code.',
  },
  // (B) design-system — arbitrary `[#hex]` Tailwind classes
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/(bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|decoration|shadow)-\\[#[0-9A-Fa-f]+\\]/]",
    message:
      'DESIGN-SYSTEM.md: replace arbitrary `bg-[#hex]` / `text-[#hex]` etc. with a semantic token (e.g. bg-destructive, text-success, bg-accent). See DESIGN-SYSTEM.md § "Migration table" for the Metronic-palette mapping.',
  },
  {
    selector:
      "JSXAttribute[name.name='className'] TemplateElement[value.raw=/(bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|caret|accent|decoration|shadow)-\\[#[0-9A-Fa-f]+\\]/]",
    message:
      'DESIGN-SYSTEM.md: replace arbitrary `bg-[#hex]` / `text-[#hex]` etc. with a semantic token. See DESIGN-SYSTEM.md § "Migration table".',
  },
]

// (C) Layout consistency — a page's ROOT element must not set its own outer
// padding / margin / max-width / container. The AppShell owns the single outer
// frame (p-5 lg:p-7); a page that re-pads its root makes the content shift when
// the user navigates between pages. These selectors target only the element
// returned directly from a `return (…)` statement, and are scoped (below) to
// page files. See Coding-guideline.md §10 / DESIGN-SYSTEM.md "Page layout & spacing".
const layoutRootSyntaxRules = [
  {
    selector:
      "ReturnStatement > JSXElement > JSXOpeningElement > JSXAttribute[name.name='className'] Literal[value=/(^|\\s|:)(p[xytblr]?-([1-9]|\\[)|m[xytblr]?-([1-9]|\\[)|mx-auto|max-w-|container)/]",
    message:
      'Layout consistency: the AppShell owns the outer page frame (p-5 lg:p-7). A page root must not set its own padding/margin/max-width/container — it shifts the content when navigating between pages. Remove it (the frame is already applied) or compose from a page-shell. See Coding-guideline.md §10.',
  },
  {
    selector:
      "ReturnStatement > JSXElement > JSXOpeningElement > JSXAttribute[name.name='className'] TemplateElement[value.raw=/(^|\\s|:)(p[xytblr]?-([1-9]|\\[)|m[xytblr]?-([1-9]|\\[)|mx-auto|max-w-|container)/]",
    message:
      'Layout consistency: the AppShell owns the outer page frame (p-5 lg:p-7). A page root must not set its own padding/margin/max-width/container. See Coding-guideline.md §10.',
  },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
  },
  // Dead-code guardrail (Coding-guideline dead-code policy + knip.json).
  // `unused-imports/no-unused-imports` is auto-fixable — `eslint --fix` strips
  // orphaned imports; `no-unused-vars` reports dead locals (underscore-prefixed
  // names are intentionally ignored). Kept at 'warn' so it does not break the
  // migration-era `lint` gate, while still surfacing regressions and letting
  // CI/knip catch dead modules. `@typescript-eslint/no-unused-vars` is turned
  // off here to avoid duplicate reporting against the unused-imports plugin.
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Naked-string guardrail (Coding-guideline §16.12). Flags user-facing string
  // literals in components — JSX text and user-facing attributes (placeholder,
  // title, aria-label, alt, label) — so new copy is routed through a centralized
  // co-located `*.strings.ts` / domain label map instead of being hardcoded.
  // Used purely as a literal-string DETECTOR (no i18n runtime / translations).
  //
  // 'warn' (not 'error') so it surfaces the migration backlog without breaking
  // the migration-era `lint` gate — fix-as-you-go, exactly like the typography
  // (§8.4) and color-token (§8.5) migrations. `mode: 'jsx-only'` keeps it to
  // component-visible text + attributes and off JS-internal strings (query keys,
  // enum values, config objects), which would otherwise be pure noise.
  {
    files: ['src/modules/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: [
      'src/components/ui/**/*.{ts,tsx}', // shadcn primitives (library, not feature copy)
      '**/*.stories.{ts,tsx}',
      '**/*.test.{ts,tsx}',
    ],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'warn',
        {
          mode: 'jsx-only',
          // Attributes are an allow-LIST: only check the props that actually
          // carry user-facing copy. This avoids whack-a-mole excluding the many
          // technical string props in the codebase (entityType, quotableType,
          // backHref, variant, persistKey, …). JSX *text* is always checked
          // regardless of this list.
          'jsx-attributes': {
            include: [
              'placeholder', 'title', 'alt', 'aria-label', 'label',
              'description', 'summaryLabel', 'hoverTitle', 'allLabel',
              'emptyText', 'tooltip', 'helperText', 'heading', 'subtitle',
              'confirmLabel', 'cancelLabel', 'submitLabel',
            ],
          },
          'jsx-components': { exclude: ['Trans'] },
          // react-hook-form field NAMES (`register("notes")`, `setValue(…)`)
          // are identifiers, not copy — they were ~40 false positives in WMS
          // alone. Passing `callees` replaces the plugin defaults, so they are
          // re-listed first.
          callees: {
            exclude: [
              'i18n(ext)?', 't', 'require', 'addEventListener', 'removeEventListener',
              'postMessage', 'getElementById', 'dispatch', 'commit', 'includes',
              'indexOf', 'endsWith', 'startsWith',
              '(.+\\.)?register', '(.+\\.)?setValue', '(.+\\.)?getValues',
              '(.+\\.)?watch', '(.+\\.)?trigger', '(.+\\.)?resetField',
              '(.+\\.)?setError', '(.+\\.)?clearErrors', '(.+\\.)?setFocus',
            ],
          },
          words: {
            // Re-list the plugin defaults (overridden when this key is passed):
            // pure punctuation/digits and ALL-CAPS tokens — plus the unicode
            // glyphs the codebase uses as standalone JSX children.
            exclude: ['[0-9!-/:-@[-`{-~]+', '[A-Z_-]+', '—', '–', '•', '·', '×', '✓', '…', '₹', '→', '←'],
          },
        },
      ],
    },
  },
  // shadcn-generated UI components and React context files co-locate hooks/constants by design
  {
    files: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/contexts/**/*.{ts,tsx}',
      'src/shared/auth/**/*.{ts,tsx}',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Coding-guideline §"Module boundary rule" — cross-module imports must go
  // through the module's index.ts barrel. Inside src/modules/<A>/, code may
  // not reach into src/modules/<B>/pages|components|hooks|api|... directly;
  // it must import from @modules/<B> (the index). Same-module imports should
  // use relative paths (./pages/X, ../hooks/Y), not @modules/<self>/...
  //
  // The pattern bans `@modules/<X>/<anything>` and `@/modules/<X>/<anything>`
  // — i.e. anything with a slash after the module folder. The bare form
  // `@modules/<X>` (resolving to the index) remains allowed.
  //
  // Warning-level during migration. The router and a handful of legacy CRM
  // call-sites are pre-existing violations that will be cleaned up in
  // follow-up commits before flipping this to 'error'.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['@modules/*/*', '@/modules/*/*'],
              message:
                'Cross-module deep import. Import from the module index (@modules/<name>) instead. For same-module imports, use a relative path (./pages/X, ../hooks/Y).',
            },
          ],
        },
      ],
    },
  },
  // Combined `no-restricted-syntax` block for all feature code — see the
  // `designSyntaxRules` comment above for why the selectors are spread in from
  // a shared const rather than inlined per block.
  //
  // (A) Coding-guideline §8.4 — all display text goes through <Typography
  //     variant=…>.  Flag raw <h1>–<h6> JSX and inline text-size Tailwind
  //     classes in feature code.  Excluded paths: src/components/ui/** owns
  //     the primitive itself, and the RichTextEditor / markdown content
  //     surfaces legitimately render raw heading tags from third-party HTML.
  //
  // (B) DESIGN-SYSTEM.md § "Token reference" — colour decisions in feature code must
  //     go through Tier 2 semantic tokens (`bg-primary`, `text-success`,
  //     `bg-destructive-soft`, …).  Arbitrary `bg-[#hex]` / `text-[#hex]` /
  //     `border-[#hex]` etc. bypass the theme system and break dark mode.
  //
  // Warning-level during migration.  Flip to 'error' once the codebase has
  // been migrated to semantic tokens.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/ui/**/*.{ts,tsx}',
      'src/components/ui/rich-text-editor.tsx',
      'src/components/common/display/chartTheme.tsx',  // self-contained chart palette
    ],
    rules: {
      'no-restricted-syntax': ['warn', ...designSyntaxRules],
    },
  },
  // (C) Layout consistency — scoped to PAGE files only. A page file matches both
  // this block and the design-system block above; because flat config REPLACES
  // (not merges) `no-restricted-syntax`, this block re-includes designSyntaxRules
  // so pages keep the typography + hex rules AND gain the page-root layout guard.
  {
    files: ['src/modules/**/pages/**/*.{ts,tsx}', 'src/app/*Page.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        ...designSyntaxRules,
        ...layoutRootSyntaxRules,
      ],
    },
  },
  // Size + complexity limits (Coding-guideline §14). Code lines only; warn so
  // they ratchet (fix-as-you-go) instead of failing the build.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
      'max-params': ['warn', 4],
    },
  },
  // API wrapper files are many small functions — a higher file cap.
  {
    files: ['src/modules/*/api/**/*.ts', 'src/modules/*/api.ts', 'src/shared/api/**/*.ts'],
    rules: {
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  // Exempt: declarative / generated / mock / test files are long by nature.
  {
    files: [
      'src/**/*.strings.ts',
      'src/**/*.columns.ts',
      'src/shared/api/schema.gen.ts',
      'src/shared/api/endpoints.ts',
      'src/modules/*/data/**',
      'src/**/*.stories.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  },
  // Storybook — best-practice lint rules for *.stories files.
  ...storybook.configs['flat/recommended'],
  // Fast Refresh doesn't apply to story files (they export meta/story objects,
  // not components), so the react-refresh rule would false-positive on them.
  {
    files: ['**/*.stories.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
