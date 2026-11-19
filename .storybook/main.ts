import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-docs', // autodocs from component types
    '@storybook/addon-a11y', // accessibility checks per story
    '@storybook/addon-themes', // light / dark toolbar toggle (see preview.tsx)
  ],
  framework: '@storybook/react-vite',
  typescript: {
    // Read real TS prop types so EVERY component auto-gets controls (booleans
    // → toggles, string-union props → selects). The default `react-docgen`
    // can't read TS types, which is why un-configured props rendered as
    // "Setup controls". The propFilter keeps only each component's OWN props —
    // not the hundreds of inherited HTML / Base UI attributes from node_modules.
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
};

export default config;
