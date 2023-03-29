import { defineConfig } from "vite";

export default defineConfig({
	base: "",
	mode: "production",
	build: {
		minify: true,
		target: "esnext",
	},
	css: {
		devSourcemap: true,
		modules: {
			scopeBehaviour: "global",
		},
	},
});
