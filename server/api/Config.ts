import * as dotenv from "dotenv";

dotenv.config();

export interface IConfig {
	readonly Port: number;
	readonly ApiUrl: string;
	readonly IsDebugMode: boolean;
	readonly IsLocalDevMode: boolean;
}

export const config: IConfig = {
	Port: Number(process.env.PORT) || 3000,
	ApiUrl: process.env.API_URL || "",
	IsDebugMode: Boolean(process.env.IS_DEBUG_MODE) || false,
	IsLocalDevMode: Boolean(process.env.IS_LOCAL_DEV_MODE) || false,
} as const;

/* function GetEnv(name: string): any {
	if (process.env[name] === null || process.env[name] === undefined) {
		throw new Error(`Environment variable ${name} not found`);
	}

	let value: any = process.env[name]!;

	if (value === "true") value = true;
	if (value === "false") value = false;
	if (value === "null") value = null;
	if (!isNaN(Number(value))) value = Number(value);

	return value;
} */
