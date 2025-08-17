import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, disabled, children, ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:rounded-lg disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
    
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-white",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-white",
      outline: "border border-input bg-background hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-teal-700",
      ghost: "hover:bg-teal-50 hover:text-teal-700",
      link: "text-primary underline-offset-4 hover:underline hover:text-teal-600",
    }
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-lg px-3",
      lg: "h-11 rounded-lg px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
