import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Compiles JSX with React's automatic runtime (no `import React` needed in component files).
export default defineConfig({ plugins: [react()] });
