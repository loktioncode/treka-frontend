import { motion, Variants } from "framer-motion";

export function GlowingRoute({ className = "" }: { className?: string }) {
  const lineVariants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "loop" as const, repeatDelay: 1 } as any
    }
  };

  const nodeVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: { delay: i * 0.8, duration: 0.5 }
    })
  };

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 600 400" className="w-full h-full drop-shadow-xl overflow-visible">
        <defs>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Faded Background Map Grid / Lines */}
        <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" fill="none">
          <path d="M50,100 L550,100" />
          <path d="M50,200 L550,200" />
          <path d="M50,300 L550,300" />
          <path d="M150,50 L150,350" />
          <path d="M300,50 L300,350" />
          <path d="M450,50 L450,350" />
        </g>

        {/* The Route Path */}
        <motion.path
          d="M100,300 C150,280 180,200 250,220 S320,150 400,180 S480,100 520,80"
          stroke="url(#routeGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          filter="url(#routeGlow)"
          variants={lineVariants}
          initial="hidden"
          animate="visible"
        />

        {/* Stops / Nodes */}
        <g filter="url(#routeGlow)">
          <motion.circle custom={0} variants={nodeVariants} initial="hidden" animate="visible" cx="100" cy="300" r="6" fill="#0ea5e9" className="glow-point" />
          <motion.circle custom={0} variants={nodeVariants} initial="hidden" animate="visible" cx="100" cy="300" r="16" fill="rgba(14, 165, 233, 0.2)" />
          
          <motion.circle custom={1} variants={nodeVariants} initial="hidden" animate="visible" cx="250" cy="220" r="5" fill="#14b8a6" />
          <motion.circle custom={1} variants={nodeVariants} initial="hidden" animate="visible" cx="250" cy="220" r="3" fill="#fff" />
          
          <motion.circle custom={2} variants={nodeVariants} initial="hidden" animate="visible" cx="400" cy="180" r="5" fill="#f59e0b" />
          <motion.circle custom={2} variants={nodeVariants} initial="hidden" animate="visible" cx="400" cy="180" r="3" fill="#fff" />
          
          <motion.circle custom={3} variants={nodeVariants} initial="hidden" animate="visible" cx="520" cy="80" r="8" fill="#ec4899" className="glow-point" />
          <motion.circle custom={3} variants={nodeVariants} initial="hidden" animate="visible" cx="520" cy="80" r="20" fill="rgba(236, 72, 153, 0.2)" />
        </g>
        
        {/* Floating Labels */}
        <text x="115" y="310" fill="#cbd5e1" fontSize="12" fontWeight="bold">Depot (Start)</text>
        <text x="500" y="60" fill="#cbd5e1" fontSize="12" fontWeight="bold">Client C (Arriving)</text>
      </svg>
    </div>
  );
}
