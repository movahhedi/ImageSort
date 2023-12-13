// import Typescript from "@rollup/plugin-typescript";
import Typescript from "rollup-plugin-typescript2";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import Commonjs from "@rollup/plugin-commonjs";
import Json from "@rollup/plugin-json";
import Terser from "@rollup/plugin-terser";
// import KeysTransformer from "ts-transformer-keys/transformer";
// import dts from "rollup-plugin-dts";
// import tsConfig from "./tsconfig.json" assert { type: "json" };

export default [
	{
		context: "this",
		input: "dist/server/api/index.js",
		output: {
			file: "build/index.js",
			format: "cjs",
			sourcemap: true,
		},
		plugins: [
			// nodeResolve({ preferBuiltins: true }),
			Typescript({
				tsconfig: "./tsconfig.json",
				/* transformers: [
					(service) => ({
						before: [KeysTransformer(service.getProgram())],
						after: [],
					}),
				], */
			}),
			Commonjs(),
			Json(),
			Terser(),
		],
	},
	/*{
		input: "api/index.ts",
		output: {
			file: "lockstep-api.d.ts",
			format: "esm",
		},
		plugins: [dts()],
	},*/
];
