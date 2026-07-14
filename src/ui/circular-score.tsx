import { cn } from "~/lib/utils";
import type { ScoreTone } from "./score";

const SIZE = 58;
const STROKE_WIDTH = 5;

export function CircularScore({
	score,
	tone,
}: {
	score: number | null;
	tone: ScoreTone;
}) {
	const radius = (SIZE - STROKE_WIDTH) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset =
		score !== null ? circumference * (1 - score / 100) : circumference;
	const strokeColor =
		tone === "green"
			? "stroke-green-500"
			: tone === "orange"
				? "stroke-amber-500"
				: tone === "red"
					? "stroke-red-500"
					: "stroke-muted-foreground/30";
	const textColor =
		tone === "green"
			? "text-green-600"
			: tone === "orange"
				? "text-amber-600"
				: tone === "red"
					? "text-red-600"
					: "text-muted-foreground";

	return (
		<div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
			<svg aria-hidden="true" className="-rotate-90" width={SIZE} height={SIZE}>
				<circle
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={radius}
					fill="none"
					strokeWidth={STROKE_WIDTH}
					className="stroke-muted"
				/>
				<circle
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={radius}
					fill="none"
					strokeWidth={STROKE_WIDTH}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className={cn("transition-all", strokeColor)}
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span
					className={cn(
						"text-lg font-bold tabular-nums leading-none",
						textColor,
					)}
				>
					{score !== null ? score : "–"}
				</span>
			</div>
		</div>
	);
}
