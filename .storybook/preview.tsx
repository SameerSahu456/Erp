import type { Preview, Decorator } from '@storybook/react-vite'
import { withThemeByClassName } from '@storybook/addon-themes'

// Pull in the full design-token pipeline (Tailwind v4 + Tier 1 ramps + Tier 2
// semantic tokens + component utilities) so components render exactly as they
// do in the app.
import '../src/styles/index.css'

// The token layer lives on `[data-theme='itasm']` (light) and
// `.dark [data-theme='itasm']` (dark). We keep the brand attribute on <html>
// permanently; addon-themes toggles the `.dark` class on <html> on top of it,
// and we render every story on a `bg-background` surface so the active palette
// is obvious in both modes.
const withBrandSurface: Decorator = (Story) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', 'itasm')
  }
  return (
    <div
      data-theme="itasm"
      className="bg-background text-foreground min-h-screen p-8 font-sans antialiased"
    >
      <Story />
    </div>
  )
}

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'todo' },
    layout: 'fullscreen',
    options: {
      storySort: {
        order: ['Foundations', 'Primitives', 'Forms', 'Feedback', '*'],
      },
    },
  },
  // Polymorphism / ref props (asChild, render, ref, nativeButton) clone or
  // replace the rendered element — toggling them in the auto-generated Controls
  // panel breaks rendering (e.g. asChild=true with a plain-text child throws
  // `React.Children.only expected a single React element child`). Hide them
  // from controls globally; stories that demonstrate them set them in code.
  argTypes: {
    asChild: { control: false, table: { disable: true } },
    render: { control: false, table: { disable: true } },
    ref: { control: false, table: { disable: true } },
    nativeButton: { control: false, table: { disable: true } },
  },
  decorators: [
    withBrandSurface,
    withThemeByClassName({
      themes: { Light: '', Dark: 'dark' },
      defaultTheme: 'Light',
      parentSelector: 'html',
    }),
  ],
}

export default preview
