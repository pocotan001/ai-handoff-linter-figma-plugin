import { LayersIcon } from "lucide-react";
import { cn } from "~/lib/utils";

export function LayerNameMeta({
	className,
	name,
}: {
	className?: string;
	name: string;
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 items-center gap-1 text-[11px] leading-4 text-muted-foreground",
				className,
			)}
			title={name}
		>
			<LayersIcon className="size-3 shrink-0" aria-hidden="true" />
			<span className="min-w-0 truncate font-mono">{name}</span>
		</div>
	);
}
