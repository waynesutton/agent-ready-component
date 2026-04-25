import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "ghost", className, children, ...rest }: ButtonProps) {
  const classes = `btn btn-${variant}${className ? ` ${className}` : ""}`;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
