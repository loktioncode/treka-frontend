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
  type = 'general',
  className, 
  ...props 
}: { 
  status: 'active' | 'inactive' | 'pending' | 'critical' | 'maintenance' | 'retired' | 'damaged' | 'operational' | 'warning',
  type?: 'asset' | 'component' | 'general'
} & Omit<BadgeProps, 'variant'>) {
  const statusConfig = {
    // Asset statuses
    active: { variant: "success" as const, label: "Active" },
    maintenance: { variant: "warning" as const, label: "Maintenance" },
    retired: { variant: "secondary" as const, label: "Retired" },
    damaged: { variant: "destructive" as const, label: "Damaged" },
    
    // Component statuses
    operational: { variant: "success" as const, label: "Operational" },
    warning: { variant: "warning" as const, label: "Warning" },
    critical: { variant: "destructive" as const, label: "Critical" },
    
    // General statuses
    inactive: { variant: "secondary" as const, label: "Inactive" },
    pending: { variant: "warning" as const, label: "Pending" }
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive

  return (
    <Badge 
      variant={config.variant} 
      className={cn("capitalize", className)} 
      {...props}
    >
      <div className={cn(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        (status === 'active' || status === 'operational') && "bg-green-400",
        (status === 'inactive' || status === 'retired') && "bg-gray-400", 
        (status === 'pending' || status === 'warning' || status === 'maintenance') && "bg-yellow-400",
        (status === 'critical' || status === 'damaged') && "bg-red-400"
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
      className: "bg-purple-600 text-white border-purple-200",
      label: "Super Admin"
    },
    admin: { 
      className: "bg-blue-600 text-white border-blue-200",
      label: "Admin"
    },
    user: { 
      className: "bg-green-600 text-white border-green-200",
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
