import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border-3 border-brutal-black px-3 py-1 font-bold uppercase tracking-wide text-xs",
  {
    variants: {
      variant: {
        default: "bg-brutal-yellow text-brutal-black",
        secondary: "bg-brutal-pink text-brutal-white",
        destructive: "bg-brutal-red text-brutal-white",
        outline: "bg-brutal-white text-brutal-black",
        success: "bg-brutal-lime text-brutal-black",
        warning: "bg-brutal-orange text-brutal-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }