import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string | number;
    isPositive: boolean;
    label?: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'teal';
  delay?: number;
  onClick?: () => void;
  className?: string;
}

const colorConfigs = {
  blue: {
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-500",
    light: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200"
  },
  green: {
    gradient: "from-green-500 to-green-600", 
    bg: "bg-green-500",
    light: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200"
  },
  yellow: {
    gradient: "from-yellow-500 to-yellow-600",
    bg: "bg-yellow-500", 
    light: "bg-yellow-50",
    text: "text-yellow-600",
    border: "border-yellow-200"
  },
  red: {
    gradient: "from-red-500 to-red-600",
    bg: "bg-red-500",
    light: "bg-red-50", 
    text: "text-red-600",
    border: "border-red-200"
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    bg: "bg-purple-500",
    light: "bg-purple-50",
    text: "text-purple-600", 
    border: "border-purple-200"
  },
  indigo: {
    gradient: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-500",
    light: "bg-indigo-50",
    text: "text-indigo-600",
    border: "border-indigo-200"
  },
  pink: {
    gradient: "from-pink-500 to-pink-600",
    bg: "bg-pink-500",
    light: "bg-pink-50", 
    text: "text-pink-600",
    border: "border-pink-200"
  },
  teal: {
    gradient: "from-teal-500 to-teal-600",
    bg: "bg-teal-500",
    light: "bg-teal-50",
    text: "text-teal-600",
    border: "border-teal-200"
  }
};

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  color = 'blue', 
  delay = 0,
  onClick,
  className 
}: StatsCardProps) {
  const colorConfig = colorConfigs[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -2 }}
      className={cn("cursor-pointer", className)}
      onClick={onClick}
    >
      <Card className={cn(
        "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300",
        `bg-gradient-to-br ${colorConfig.gradient}`,
        "text-white"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-white">{value}</p>
                {trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                    trend.isPositive 
                      ? "bg-white/20 text-white" 
                      : "bg-white/20 text-white"
                  )}>
                    {trend.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{trend.value}</span>
                  </div>
                )}
              </div>
              {description && (
                <p className="text-xs text-white/70">{description}</p>
              )}
              {trend?.label && (
                <p className="text-xs text-white/60 mt-1">{trend.label}</p>
              )}
            </div>
            {Icon && (
              <div className="relative">
                <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <div className="absolute inset-0 p-4 rounded-full bg-white/10 animate-pulse" />
              </div>
            )}
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/20" />
            <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/30" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Quick stats grid component
interface QuickStatsProps {
  stats: Array<Omit<StatsCardProps, 'delay'>>;
  className?: string;
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", 
      className
    )}>
      {stats.map((stat, index) => (
        <StatsCard
          key={`${stat.title}-${index}`}
          {...stat}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}
