import Koa from "koa";
import KoaJson from "koa-json";
import KoaCompress from "koa-compress";
import { koaBody } from "koa-body";
import Serve from "koa-static";
import KoaCors from "@koa/cors";
import KoaRouter from "@koa/router";
import { type Server } from "http";
import Colors from "colors/safe";

import { glob } from "glob";
import { existsSync as exists } from "fs";
// eslint-disable-next-line @typescript-eslint/naming-convention
import * as fs from "fs/promises";
import * as Path from "path";
import Sharp from "sharp";

import { config, type IConfig } from "./Config";

console.log(Colors.bgGreen("  AdmoPro backend server started  "));

const outputFile = "data/output.json",
	albumsFile = "data/Albums.json",
	aiFile = "data/AI.txt",
	errorsFile = "data/errors.txt";

let imagesGlob: Array<string>;

type IImageEntry = {
	ai: number;
	imagePath: string;
	albumName: string;
	cropData: Record<string, any>;
};

export class App {
	readonly #config: IConfig;
	readonly #koa: Koa;
	#server?: Server;
	readonly #router: KoaRouter;

	constructor(config: IConfig) {
		this.#config = config;
		this.#koa = new Koa();
		this.#router = new KoaRouter({ prefix: "/api" });

		this.#koa
			// Yes, the errorhandler is added twice, once at the top, once before adding the router. This is intentional.
			.use(this.errorHandler)
			.use(this.decorateContext)
			.use(KoaCompress())
			.use(
				koaBody({
					multipart: true,
					/*formidable: {
						uploadDir: path.join(__dirname, '/public/uploads'),
						keepExtensions: true,
					},*/
				}),
			)
			.use(
				KoaJson({
					spaces: 4,
				}),
			);

		if (config.IsLocalDevMode) {
			this.#koa.use(
				KoaCors({
					credentials: true,
				}),
			);

			/**
			 * Close the connection (don't `keep-alive`) so the server can close quickly
			 * and vite-node/nodemon's hotreload would work.
			 * Also read https://github.com/koajs/koa/issues/879
			 */
			this.#koa.use(async (ctx: Koa.Context, next: Koa.Next) => {
				ctx.set("Connection", "close");
				await next();
			});
		}

		// Yes, the errorhandler is added twice, once at the top, once before adding the router. This is intentional.
		this.#koa.use(this.errorHandler);

		this.#router.use("/data/input", Serve("data/input"));
		this.#router.use("/assets", Serve("assets"));

		this.#router.get("/initials", async (ctx, next) => {
			imagesGlob = await glob("data/input/{*.jpg,*.jpeg,*.png,*.gif,*.JPG,*.JPEG,*.PNG,*.GIF}");
			let albums = await fs.readFile(albumsFile, "utf8");
			albums = JSON.parse(albums);
			const ai = await ReadAiFile(0);
			await WriteAiFile(ai);

			ctx.body = {
				albums,
				images: imagesGlob,
				ai,
			};
		});

		this.#router.post("/submit", async (ctx, next) => {
			try {
				let ai = await ReadAiFile(0),
					entries: IImageEntry[] = [];
				if (exists(outputFile)) {
					const entriesJson = await fs.readFile(outputFile, "utf8");
					entries = JSON.parse(entriesJson);
				}
				// entries.push([ai, ctx.request.body.image, ctx.request.body.album, JSON.parse(ctx.request.body.data)]);
				entries.push({
					ai,
					imagePath: ctx.request.body.image,
					albumName: ctx.request.body.album,
					cropData: ctx.request.body.data,
				});
				ai++;
				await WriteAiFile(ai);
				await fs.writeFile(outputFile, JSON.stringify(entries));

				ctx.body = {
					result: true,
				};
			} catch (error) {
				console.log(error);
				ctx.body = {
					result: false,
					log: (error as Error)?.message,
					stack: (error as Error)?.stack,
				};
			}
		});

		this.#router.get("/crop", async (ctx, next) => {
			let ai = 0;
			const errors: Array<any> = [];

			try {
				if (!exists(outputFile)) {
					ctx.body = {
						result: true,
						log: "output file doesn't exist.",
					};
					return;
				}

				const entriesJson = await fs.readFile(outputFile, "utf8");
				const entries: IImageEntry[] = JSON.parse(entriesJson);
				// const entryPromises: Promise<void>[] = [];
				// [$AI, $_POST["Image"], $_POST["Album"], $ToDo];

				const entryPromises = entries.map(async (i) => {
					ai = i.ai;
					const imagePath = i.imagePath;
					const albumDir = "data/output/" + i.albumName;
					let cropData = i.cropData;
					const outputPath = albumDir + "/" + Path.basename(imagePath);

					cropData = {
						x: Math.round(cropData.x),
						y: Math.round(cropData.y),
						width: Math.round(cropData.width),
						height: Math.round(cropData.height),
					};

					if (!exists(albumDir)) {
						await fs.mkdir(albumDir, { recursive: true });
					}

					try {
						const metadata = await Sharp(imagePath).metadata();
						// Based on EXIF rotation metadata, get the right-side-up width and height
						// https://sharp.pixelplumbing.com/api-input#metadata
						/* if ((metadata.orientation || 0) >= 5) {
							metadata = { ...metadata, width: metadata.height, height: metadata.width };
							cropData = {
								...cropData,
								x: cropData.y,
								y: cropData.x,
								width: cropData.height,
								height: cropData.width,
							};
						} */

						if (
							cropData.width == 0 ||
							cropData.height == 0 ||
							(cropData.x == 0 &&
								cropData.y == 0 &&
								cropData.width == metadata.width &&
								cropData.height == metadata.height)
						) {
							// return fsPromises.rename(ImagePath, OutputPath);
							return await fs.copyFile(imagePath, outputPath);
						} else {
							return await Sharp(imagePath)
								.extract({
									left: cropData.x,
									top: cropData.y,
									width: cropData.width,
									height: cropData.height,
								})
								.withMetadata()
								.toFile(outputPath);
							// .then(() => fsPromises.unlink(ImagePath, OutputPath));
						}
					} catch (error) {
						errors.push([ai, (error as Error)?.message]);
						console.log(`--${ai}--` + (error as Error)?.message);
						await fs.appendFile(errorsFile, `--${ai}--` + (error as Error)?.message + "\r\n");
					}
				});

				const sortedDir = "data/input/Sorted-" + Date.now();

				await Promise.all(entryPromises);
				await fs.mkdir(sortedDir, { recursive: true });

				imagesGlob.forEach(async (imagePath) => {
					const outputPath = sortedDir + "/" + Path.basename(imagePath);
					await fs.rename(imagePath, outputPath);
				});

				ctx.body = {
					result: true,
					errors,
				};

				console.log("Done");
			} catch (error) {
				console.log(error);
				errors.push([ai, (error as Error)?.message]);
				await fs.appendFile(errorsFile, `--${ai}--` + (error as Error)?.message + "\r\n");

				ctx.body = {
					result: false,
					errors,
					error,
				};
			}
		});

		this.#koa.use(this.#router.routes()).use(this.#router.allowedMethods());
	}

	async start(): Promise<this> {
		await new Promise<void>((resolve) => {
			this.#server = this.#koa.listen(this.#config.Port, resolve);
		});

		console.log(Colors.bgMagenta(`  Koa is listening on port ${this.#config.Port}   `));
		return this;
	}

	async stop(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			this.#server?.close((error) => (error ? reject(error) : resolve()));
		});
	}

	private readonly errorHandler = async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
		try {
			await next();
		} catch (error) {
			console.log(error);
		}
	};

	private readonly decorateContext = async (ctx: Koa.Context, next: Koa.Next): Promise<void> => {
		ctx.AdmoPro = this;
		ctx.config = this.#config;
		return next();
	};
}

async function ReadAiFile(fallback: number) {
	if (exists(aiFile)) {
		return +(await fs.readFile(aiFile, "utf8"));
	}
	return fallback;
}

async function WriteAiFile(ai: number) {
	return fs.writeFile(aiFile, ai.toString());
}

await new App(config).start();
