import { defineConfig } from "vite";

export default defineConfig({
	root: "src",
	base: "",
	build: {
		minify: "terser",
		outDir: "../dist",
		rollupOptions: {
			input: {
				main: "src/index.html",
			},
		},
	},
	css: {
		devSourcemap: true,
		modules: {
			scopeBehaviour: "global",
		},
	},
	server: {
		hmr: true,
	},
});
