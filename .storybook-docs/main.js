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
  framework: { name: "@storybook/react-vite", options: {} },
};
