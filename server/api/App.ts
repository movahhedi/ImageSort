import Koa from "koa";
import KoaJson from "koa-json";
import KoaCompress from "koa-compress";
import { koaBody } from "koa-body";
import KoaCors from "@koa/cors";
import { type Server } from "http";
import { Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import Nodemailer from "nodemailer";
import type Winston from "winston";
import Smsir from "sms-ir-api";
import { LRUCache } from "lru-cache";
import KoaCash from "koa-cash";
import JsonFastStableStringify from "fast-json-stable-stringify";
import Colors from "colors/safe";

import { type IConfig } from "./Config";
import type { IDatabase, IKyselyDatabase } from "./Database";
import { ControllerError, RespondFail } from "./Error";
import { type IContext, MyRouter } from "./Router";
import { type IMyContextExtension } from "./Context";
import { EnableViteHotReload } from "../Utilities/ViteHotReload";
import { AddControllersToRouter } from "../Entities";
import { CreateWinstonLogger } from "./Logger";
import { ZodError } from "zod";
export { Roles, Genders, OtpTypes } from "../../../shared/src";

declare global {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface Array<T> {
		// but<K extends this, N = K[keyof K]>(o: N[]): Array<T>;
		but<TK extends this>(items: TK): Array<T>;
	}
}

Array.prototype.but = function <T>(items: T[]) {
	return this.filter((i) => !items.includes(i));
};

export class App {
	readonly #config: IConfig;
	readonly #koa: Koa<any, IMyContextExtension>;
	readonly #router: MyRouter;
	readonly #db: IKyselyDatabase;
	#server?: Server;
	readonly #logger: Winston.Logger;
	readonly #smsir: Smsir;
	readonly #mailer: Nodemailer.Transporter;
	readonly #lruCache: LRUCache<string, any, undefined>;
	readonly #koaCash: ReturnType<typeof KoaCash>;

	constructor(config: IConfig) {
		this.#config = config;
		this.#koa = new Koa();
		this.#router = new MyRouter({ prefix: "/api" });
		this.#db = new Kysely<IDatabase>({
			dialect: new MysqlDialect({
				pool: createPool(this.#config.DbConfig),
			}),
			log(event) {
				if (event.level === "query") {
					console.log(
						Colors.yellow("•"),
						Colors.green(event.query.sql),
						event.query.parameters,
						Colors.blue(" took " + event.queryDurationMillis + "ms"),
					);
				}
			},
		});

		this.#smsir = new Smsir(config.Sms.ApiKey, config.Sms.LineNumber);

		this.#mailer = Nodemailer.createTransport({
			name: config.Email.Name,
			from: {
				address: config.Email.From,
				name: config.Email.Name,
			},
			host: config.Email.Host,
			port: config.Email.Port,
			secure: false,
			auth: {
				user: config.Email.User,
				pass: config.Email.Pass,
			},
			tls: {
				ciphers: "SSLv3",
			},
		});

		this.#logger = CreateWinstonLogger({
			db: this.#db,
			mailer: this.#mailer,
			smsir: this.#smsir,
			config: this.#config,
		});

		/* new ControllerError(
			{
				logger: this.#logger,
				db: this.#db,
				config: this.#config,
			},
			{
				name: "accountDisabled",
				message: "bro",
				level: "file",
				data: {
					hi: "Bye",
				},
				debug: {
					debugOther: "hi",
				},
			},
		); */

		this.#lruCache = new LRUCache({
			max: 500,
			maxSize: 5000,
			sizeCalculation: (a: any) => (a.length as number | undefined) ?? JsonFastStableStringify(a).length,
			/** How long to live in ms */
			ttl: 5 * 60 * 1000,
		});

		this.#koaCash = KoaCash({
			setCachedHeader: true,
			compression: true,
			threshold: 1024,
			maxAge: 5 * 60 * 1000,
			get: (key: string) => {
				return this.#lruCache.get(key, { allowStale: false });
			},
			set: async (key: string, value: string, maxAge: number) => {
				this.#lruCache.set(key, value, { ttl: maxAge });
			},
			hash: (ctx) => {
				return ctx.url + JsonFastStableStringify(ctx.request.body);
			},
		});

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
			)
			.use(this.#koaCash);

		if (config.IsLocalDevMode) {
			this.#koa.use(
				KoaCors({
					// "origin": "*",
					// origin: true,
					// "allowMethods": "GET,HEAD,PUT,PATCH,POST,DELETE",
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

		AddControllersToRouter(this.#router);

		this.#koa.use(this.#router.routes()).use(this.#router.allowedMethods());
	}

	get db(): IKyselyDatabase {
		return this.#db;
	}

	get logger(): Winston.Logger {
		return this.#logger;
	}

	async start(): Promise<this> {
		await new Promise<void>((resolve) => {
			this.#server = this.#koa.listen(this.#config.Port, resolve);
		});

		console.log(Colors.bgMagenta(`  Koa is listening on port ${this.#config.Port}   `));
		// console.log(`Open ${this.#config.ApiUrl}`);

		// vite-node's hotreload
		if (this.#config.IsLocalDevMode && import.meta?.hot) {
			EnableViteHotReload(this.#server!);
		}

		return this;
	}

	async stop(): Promise<void> {
		this.#db?.destroy();

		await new Promise<void>((resolve, reject) => {
			this.#server?.close((error) => (error ? reject(error) : resolve()));
		});
	}

	private readonly errorHandler = async (ctx: IContext, next: Koa.Next): Promise<void> => {
		try {
			await next();
		} catch (error) {
			let controllerError: ControllerError;

			if (error instanceof ControllerError) {
				controllerError = error;
			} else if (error instanceof ZodError) {
				controllerError = ControllerError.fromZodError(ctx, error);
			} else if (error instanceof Error) {
				controllerError = new ControllerError(ctx, error);
			} else {
				controllerError = ControllerError.fromTryCatchAny(ctx, error);
			}

			// controllerError = error instanceof Error ? new ControllerError(ctx, error) : ControllerError.fromTryCatchAny(ctx, error);
			RespondFail(ctx, controllerError);
		}
	};

	private readonly decorateContext = async (ctx: IContext, next: Koa.Next): Promise<void> => {
		ctx.AdmoPro = this;
		ctx.db = this.#db;
		ctx.logger = this.#logger;
		ctx.smsir = this.#smsir;
		ctx.mailer = this.#mailer;
		ctx.lruCache = this.#lruCache;
		ctx.config = this.#config;
		return next();
	};
}
