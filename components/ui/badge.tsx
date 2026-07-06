import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-white/10 text-slate-300",
        variant === "success" && "bg-green-500/15 text-green-400",
        variant === "warning" && "bg-yellow-500/15 text-yellow-400",
        variant === "danger"  && "bg-[#E8001C]/15 text-[#E8001C]",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
