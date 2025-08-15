import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
  size?: "sm" | "md" | "lg"
}

function Badge({ className, variant = "default", size = "md", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
    warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
    info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
  }

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-base",
  }

  return (
    <div
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

// Specialized status badges
export function StatusBadge({ 
  status, 
  className, 
  ...props 
}: { 
  status: 'active' | 'inactive' | 'pending' | 'critical' 
} & Omit<BadgeProps, 'variant'>) {
  const statusConfig = {
    active: { variant: "success" as const, label: "Active" },
    inactive: { variant: "secondary" as const, label: "Inactive" },
    pending: { variant: "warning" as const, label: "Pending" },
    critical: { variant: "destructive" as const, label: "Critical" }
  }

  const config = statusConfig[status]

  return (
    <Badge 
      variant={config.variant} 
      className={cn("capitalize", className)} 
      {...props}
    >
      <div className={cn(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        status === 'active' && "bg-status-active",
        status === 'inactive' && "bg-status-inactive", 
        status === 'pending' && "bg-status-pending",
        status === 'critical' && "bg-status-critical"
      )} />
      {config.label}
    </Badge>
  )
}

// Role badges with specific colors
export function RoleBadge({ 
  role, 
  className, 
  ...props 
}: { 
  role: 'super_admin' | 'admin' | 'user' 
} & Omit<BadgeProps, 'variant'>) {
  const roleConfig = {
    super_admin: { 
      className: "bg-role-super-admin text-white border-role-super-admin/20",
      label: "Super Admin"
    },
    admin: { 
      className: "bg-role-admin text-white border-role-admin/20",
      label: "Admin"
    },
    user: { 
      className: "bg-role-user text-white border-role-user/20",
      label: "User"
    }
  }

  const config = roleConfig[role]

  return (
    <Badge 
      className={cn(config.className, "font-semibold", className)} 
      {...props}
    >
      {config.label}
    </Badge>
  )
}

export { Badge }
