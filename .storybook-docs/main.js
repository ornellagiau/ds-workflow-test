import remarkGfm from "remark-gfm";

// Polished docs Storybook for designers and product. Reads the SAME files as .storybook/.
// This folder holds styling and settings only. All readable content lives in src/**/*.mdx.
/** @type { import('@storybook/react-vite').StorybookConfig } */
export default {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx)"],
  addons: [
    {
      name: "@storybook/addon-docs",
      // remark-gfm: Markdown tables in MDX render as real tables
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
  ],
  // The font files live in docs-assets/fonts and are served from the site root (/fonts/...).
  staticDirs: ["../docs-assets"],
  // Readers only need the docs: switch off the built-in story tools (grid, background, outline, measure, viewport, highlight).
  features: { backgrounds: false, measure: false, outline: false, highlight: false, viewport: false },
  framework: { name: "@storybook/react-vite", options: {} },
};
