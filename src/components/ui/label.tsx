import { cn } from "@/src/lib/utils";
import type { ComponentProps } from "react";

function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("cursor-pointer text-xs select-none", className)}
      {...props}
    />
  );
}

export { Label };
