import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
          variant === "default" && "bg-[#E8001C] text-white hover:bg-[#c8001a]",
          variant === "ghost" && "text-slate-400 hover:text-white hover:bg-white/5",
          variant === "outline" && "border border-white/20 text-slate-300 hover:bg-white/5",
          size === "sm" && "text-xs px-3 py-1.5",
          size === "default" && "text-sm px-4 py-2",
          size === "lg" && "text-base px-5 py-2.5",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
