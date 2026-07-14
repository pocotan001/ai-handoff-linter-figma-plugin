declare module "node:fs" {
	export function existsSync(path: string): boolean;
	export function readFileSync(path: string | URL, encoding: "utf8"): string;
	export function realpathSync(path: string): string;
}
