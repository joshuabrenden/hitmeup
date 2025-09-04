import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-bold uppercase tracking-wide disabled:pointer-events-none disabled:opacity-50 transition-all border-4 border-black",
  {
    variants: {
      variant: {
        default: "bg-yellow-400 text-black shadow-lg hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
        destructive: "bg-red-500 text-white shadow-lg hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
        outline: "bg-white text-black shadow-lg hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
        secondary: "bg-pink-500 text-white shadow-lg hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
        ghost: "border-transparent shadow-none hover:bg-cyan-400 hover:text-black",
        link: "border-transparent shadow-none text-black underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-14 px-8 py-4 text-lg",
        xl: "h-16 px-10 py-5 text-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }