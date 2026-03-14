'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Pause, CheckCircle, TrendingUp, Shield, Zap, Users, BarChart3 } from 'lucide-react';

interface CarouselSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: string[];
  ctaText?: string;
  ctaLink?: string;
}

const slides: CarouselSlide[] = [
  {
    id: 1,
    title: "Streamline Asset Management",
    subtitle: "Centralized Control & Visibility",
    description: "Manage all your critical assets and components from a single, intuitive dashboard. Track maintenance schedules, monitor performance, and prevent costly downtime.",
    icon: TrendingUp,
    color: "from-blue-500 to-blue-600",
    features: [
      "Real-time asset tracking and monitoring",
      "Automated maintenance scheduling",
      "Performance analytics and reporting",
      "Cost optimization insights"
    ],
    ctaText: "Explore Assets",
    ctaLink: "/dashboard/assets"
  },
  {
    id: 2,
    title: "Prevent Costly Downtime",
    subtitle: "Proactive Maintenance & Alerts",
    description: "Stop unexpected failures before they happen. Our intelligent system predicts maintenance needs and alerts you to potential issues before they become problems.",
    icon: Shield,
    color: "from-green-500 to-green-600",
    features: [
      "Predictive maintenance algorithms",
      "Early warning system for critical issues",
      "Automated alert notifications",
      "Maintenance history tracking"
    ],
    ctaText: "View Components",
    ctaLink: "/dashboard/components"
  },
  {
    id: 3,
    title: "Boost Operational Efficiency",
    subtitle: "Data-Driven Decision Making",
    description: "Transform raw data into actionable insights. Make informed decisions with comprehensive analytics, performance metrics, and trend analysis.",
    icon: BarChart3,
    color: "from-purple-500 to-purple-600",
    features: [
      "Comprehensive performance metrics",
      "Trend analysis and forecasting",
      "Customizable dashboards",
      "Export and reporting tools"
    ],
    ctaText: "View Analytics",
    ctaLink: "/dashboard/analytics"
  },
  {
    id: 4,
    title: "Scale with Confidence",
    subtitle: "Enterprise-Grade Security & Reliability",
    description: "Built for growing organizations with enterprise-level security, role-based access control, and seamless scalability to support your business growth.",
    icon: Users,
    color: "from-orange-500 to-orange-600",
    features: [
      "Role-based access control",
      "Enterprise-grade security",
      "Multi-tenant architecture",
      "24/7 system monitoring"
    ],
    ctaText: "Manage Users",
    ctaLink: "/dashboard/users"
  }
];

export function MarketingCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying || isHovered) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div 
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Carousel */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white h-full">
        <CardContent className="p-0 h-full">
          <div className="relative h-80">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 1.95, ease: "easeInOut" as const }}
                className="absolute inset-0 flex items-center"
              >
                <div className="grid grid-cols-1 gap-6 p-6 w-full h-full">
                  {/* Content Side */}
                  <div className="space-y-4 flex flex-col justify-center h-full">
                    <div className="space-y-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${slides[currentSlide].color} text-white text-sm font-medium`}>
                        {React.createElement(slides[currentSlide].icon, { className: "h-4 w-4" })}
                        {slides[currentSlide].subtitle}
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                        {slides[currentSlide].title}
                      </h2>
                      <p className="text-base text-gray-600 leading-relaxed">
                        {slides[currentSlide].description}
                      </p>
                    </div>

                    {/* Features List - Compact */}
                    <div className="space-y-2">
                      {slides[currentSlide].features.slice(0, 3).map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    {slides[currentSlide].ctaText && slides[currentSlide].ctaLink && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="pt-2"
                      >
                        <a
                          href={slides[currentSlide].ctaLink}
                          className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r ${slides[currentSlide].color} hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
                        >
                          {slides[currentSlide].ctaText}
                          <Zap className="h-4 w-4" />
                        </a>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls - Compact */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
        {/* Play/Pause Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-300 h-8 w-8 p-0"
        >
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>

        {/* Previous/Next Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={prevSlide}
          className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-300 h-8 w-8 p-0"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={nextSlide}
          className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-300 h-8 w-8 p-0"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Slide Indicators - Compact */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentSlide
                ? 'bg-white shadow-lg scale-125'
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" as const }}
        />
      </div>
    </div>
  );
}
