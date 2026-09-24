import remarkGfm from "remark-gfm";

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
