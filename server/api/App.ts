import Koa from "koa";
import KoaJson from "koa-json";
import KoaCompress from "koa-compress";
import { koaBody } from "koa-body";
import serve from "koa-static";
import KoaCors from "@koa/cors";
import KoaRouter from "@koa/router";
import { type Server } from "http";
import Colors from "colors/safe";

import { glob } from "glob";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import sharp from "sharp";

import { IConfig } from "./Config";

const OutputFile = "data/output.json",
	AlbumsFile = "data/Albums.json",
	AIFile = "data/AI.txt",
	ErrorsFile = "data/errors.txt";

let ImagesGlob;

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

		this.#router.use("/data/input", serve("data/input"));
		this.#router.use("/assets", serve("assets"));

		this.#router.get("/initials", async (ctx, next) => {
			const images = await glob("data/input/{*.jpg,*.jpeg,*.png,*.gif,*.JPG,*.JPEG,*.PNG,*.GIF}");
			let albums = fs.readFileSync(AlbumsFile, "utf8");
			albums = JSON.parse(albums);
			let ai = 0;

			ImagesGlob = images;

			if (fs.existsSync(AIFile)) ai = +fs.readFileSync(AIFile, "utf8");
			fs.writeFileSync(AIFile, ai.toString());

			ctx.body = {
				Albums: albums,
				Images: images,
				AI: ai,
			};
		});

		this.#router.post("/submit", async (ctx, next) => {
			try {
				let ai = 0,
					entries: Array<any> = [];
				if (fs.existsSync(AIFile)) ai = +fs.readFileSync(AIFile, "utf8");
				if (fs.existsSync(OutputFile)) {
					let entriesJson = fs.readFileSync(OutputFile, "utf8");
					entries = JSON.parse(entriesJson);
				}
				entries.push([ai, ctx.request.body.Image, ctx.request.body.Album, JSON.parse(ctx.request.body.Data)]);
				ai++;
				fs.writeFileSync(AIFile, ai.toString());
				fs.writeFileSync(OutputFile, JSON.stringify(entries));

				ctx.body = {
					Result: true,
				};
			} catch (error) {
				console.log(error);
				ctx.body = {
					Result: false,
					Log: (error as Error)?.message,
					Stack: (error as Error)?.stack,
				};
			}
		});

		this.#router.get("/crop", async (ctx, next) => {
			let ai = 0;
			const errors: Array<any> = [];

			try {
				if (!fs.existsSync(OutputFile)) {
					ctx.body = {
						Result: true,
						Log: "output file doesn't exist.",
					};
					return;
				}

				const entriesJson = fs.readFileSync(OutputFile, "utf8");
				const entries = JSON.parse(entriesJson);
				const entryPromises: Promise<void>[] = [];
				// [$AI, $_POST["Image"], $_POST["Album"], $ToDo];

				entries.forEach((i) => {
					ai = i[0];
					let ImagePath = i[1];
					let AlbumDir = "data/output/" + i[2];
					let CropData = i[3];
					let OutputPath = AlbumDir + "/" + path.basename(ImagePath);

					CropData = {
						x: Math.round(CropData.x),
						y: Math.round(CropData.y),
						width: Math.round(CropData.width),
						height: Math.round(CropData.height),
					};

					if (!fs.existsSync(AlbumDir)) {
						fs.mkdirSync(AlbumDir, { recursive: true });
					}

					entryPromises.push(
						sharp(ImagePath)
							.metadata()
							.then((metadata) => {
								// Based on EXIF rotation metadata, get the right-side-up width and height
								// https://sharp.pixelplumbing.com/api-input#metadata
								if ((metadata.orientation || 0) >= 5) {
									metadata = { ...metadata, width: metadata.height, height: metadata.width };
									CropData = {
										...CropData,
										x: CropData.y,
										y: CropData.x,
										width: CropData.height,
										height: CropData.width,
									};
								}
								return [metadata, CropData];
							})
							.then(
								((AI, values) => {
									const [metadata, CropData] = values;
									if (
										(CropData.x == 0 &&
											CropData.y == 0 &&
											CropData.width == metadata.width &&
											CropData.height == metadata.height) ||
										CropData.width == 0 ||
										CropData.height == 0
									) {
										// return fsPromises.rename(ImagePath, OutputPath);
										return fsPromises.copyFile(ImagePath, OutputPath);
									} else {
										return sharp(ImagePath)
											.extract({
												left: CropData.x,
												top: CropData.y,
												width: CropData.width,
												height: CropData.height,
											})
											.withMetadata()
											.toFile(OutputPath);
										// .then(() => fsPromises.unlink(ImagePath, OutputPath));
									}
								}).bind(null, ai),
							)
							.catch(
								((AI, error) => {
									errors.push([AI, error.message]);
									console.log(`--${AI}--` + error.message);
									fs.appendFile(ErrorsFile, `--${AI}--` + error.message + "\r\n", () => {});
								}).bind(null, ai),
							),
					);
				});

				const sortedDir = "data/input/Sorted-" + Date.now();

				Promise.all(entryPromises)
					.then(() => {
						fs.mkdirSync(sortedDir, { recursive: true });

						ImagesGlob.forEach((imagePath) => {
							const outputPath = sortedDir + "/" + path.basename(imagePath);
							fsPromises.rename(imagePath, outputPath);
						});
					})
					.then(() => {
						ctx.body = {
							Result: true,
							Errors: errors,
						};
						console.log("Done");
					});
			} catch (error) {
				console.log(error);
				errors.push([ai, (error as Error)?.message]);
				fs.appendFile(ErrorsFile, `--${ai}--` + (error as Error)?.message + "\r\n", () => {});

				ctx.body = {
					Result: false,
					Errors: errors,
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
