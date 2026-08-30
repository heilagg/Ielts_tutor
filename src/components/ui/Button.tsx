import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          size === "sm" ? "px-3 py-1.5 text-xs min-h-9" : "min-h-11",
          size === "md" ? "px-4 py-2.5 text-sm" : size === "lg" ? "px-6 py-3.5 text-base" : "",
          variant === "primary" && "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-2)]",
          variant === "secondary" &&
            "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:brightness-95",
          variant === "ghost" && "bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]",
          variant === "danger" && "bg-[var(--color-danger)] text-white hover:brightness-95",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
