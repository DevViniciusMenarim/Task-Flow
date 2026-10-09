import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const proxy = {
  "/api": {
    target: "http://127.0.0.1:5188",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
