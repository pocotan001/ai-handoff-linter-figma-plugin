import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

type AssetSpec = {
	svg: string;
	png: string;
	width: number;
	height: number;
};

const assets: AssetSpec[] = [
	{
		svg: "assets/icon.svg",
		png: "assets/icon-128.png",
		width: 128,
		height: 128,
	},
	{
		svg: "assets/cover.svg",
		png: "assets/cover-1920x960.png",
		width: 1920,
		height: 960,
	},
];

for (const asset of assets) {
	const svg = await readFile(asset.svg);
	const resvg = new Resvg(svg, {
		fitTo: {
			mode: "width",
			value: asset.width,
		},
		font: {
			loadSystemFonts: true,
		},
	});
	const png = resvg.render().asPng();

	writePngDimensionCheck(asset, png);
	await writeFile(asset.png, png);
	console.log(`Wrote ${asset.png} (${asset.width}x${asset.height})`);
}

function writePngDimensionCheck(asset: AssetSpec, png: Uint8Array): void {
	const dimensions = readPngDimensions(png);
	if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
		throw new Error(
			`${asset.png} must be ${asset.width}x${asset.height}, got ${dimensions.width}x${dimensions.height}`,
		);
	}
}

function readPngDimensions(png: Uint8Array): { width: number; height: number } {
	const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	for (const [index, byte] of signature.entries()) {
		if (png[index] !== byte) {
			throw new Error("Rendered output is not a PNG file.");
		}
	}

	return {
		width: readUint32(png, 16),
		height: readUint32(png, 20),
	};
}

function readUint32(bytes: Uint8Array, offset: number): number {
	return (
		bytes[offset] * 0x1000000 +
		bytes[offset + 1] * 0x10000 +
		bytes[offset + 2] * 0x100 +
		bytes[offset + 3]
	);
}
