import { SVGProps } from "react";
import { motion } from "framer-motion";

export function CircuitBackground(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-950 tech-grid-bg">
      <svg
        className="absolute w-full h-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <defs>
          <linearGradient id="glowLines" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(45, 212, 191, 0)" />
            <stop offset="50%" stopColor="rgba(45, 212, 191, 0.4)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Circuit paths */}
        <g stroke="url(#glowLines)" strokeWidth="1" fill="none" filter="url(#neonGlow)">
          <motion.path 
            d="M-100,50 L200,50 L250,100 L500,100 L550,50 L1200,50" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.path 
            d="M-100,200 L150,200 L200,250 L400,250 L450,200 L1200,200" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear", delay: 1 }}
          />
          <motion.path 
            d="M-100,150 L100,150 L150,100 L300,100 L350,150 L1200,150" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: 2 }}
          />
          <motion.path 
            d="M800,-100 L800,150 L850,200 L850,500 L800,550 L800,1000" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear", delay: 0.5 }}
          />
          <motion.path 
            d="M900,-100 L900,100 L950,150 L950,400 L900,450 L900,1000" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear", delay: 3 }}
          />
          
          {/* Diagonal connects */}
          <path d="M250,100 L300,150" opacity="0.2" />
          <path d="M400,250 L450,200" opacity="0.2"/>
          <path d="M800,150 L900,100" opacity="0.2"/>
          <path d="M850,200 L950,150" opacity="0.2"/>
        </g>

        {/* Nodes */}
        <g fill="rgba(45, 212, 191, 0.8)" filter="url(#neonGlow)">
          <motion.circle cx="200" cy="50" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
          <motion.circle cx="250" cy="100" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.2 }} />
          <motion.circle cx="500" cy="100" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.4 }} />
          <motion.circle cx="550" cy="50" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
          
          <motion.circle cx="150" cy="200" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.8 }} />
          <motion.circle cx="200" cy="250" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1.0 }} />
          <motion.circle cx="400" cy="250" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1.2 }} />
          <motion.circle cx="450" cy="200" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1.4 }} />
          
          <motion.circle cx="100" cy="150" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1.6 }} />
          <motion.circle cx="150" cy="100" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1.8 }} />
          <motion.circle cx="300" cy="100" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 2.0 }} />
          <motion.circle cx="350" cy="150" r="3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 2.2 }} />
        </g>
      </svg>
      {/* Overlay gradient to fade out bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-950" />
    </div>
  );
}
