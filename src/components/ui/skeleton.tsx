import type React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("skeleton-shimmer rounded-md", className)} {...props} />;
}

export { Skeleton };
