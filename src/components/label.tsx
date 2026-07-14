import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";

function Label({ className, ...props }: ComponentProps<"label">) {
	return (
		<label
			className={cn("cursor-pointer text-xs select-none", className)}
			{...props}
		/>
	);
}

export { Label };
