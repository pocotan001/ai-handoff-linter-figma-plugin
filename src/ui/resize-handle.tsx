import { GripHorizontalIcon } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { post } from "./post";

export function ResizeHandle({ label }: { label: string }) {
	const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const startX = event.clientX;
		const startY = event.clientY;
		const startWidth = window.innerWidth;
		const startHeight = window.innerHeight;

		const onPointerMove = (moveEvent: PointerEvent) => {
			post({
				type: "resize-window",
				width: startWidth + moveEvent.clientX - startX,
				height: startHeight + moveEvent.clientY - startY,
			});
		};
		const onPointerUp = () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};

	return (
		<button
			aria-label={label}
			className="resize-handle"
			onPointerDown={onPointerDown}
			title={label}
			type="button"
		>
			<GripHorizontalIcon className="size-3.5 -rotate-45" />
		</button>
	);
}
