"use client";

import { motion, Variants } from "framer-motion";

export function WireframeSatellite({ className = "" }: { className?: string }) {
  const drawParams: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { pathLength: { delay: 0.5, type: "spring", duration: 3, bounce: 0 }, opacity: { delay: 0.5, duration: 0.1 } } as any
    }
  };

  const nodeParams: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: { delay: 1.5 + (i * 0.1), duration: 0.3 }
    })
  };

  const lineParams = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 0.4,
      transition: { delay: 2 + (i * 0.1), duration: 0.8 }
    })
  };

  // Pulse animation for the beams
  const pulseParams = {
    hidden: { opacity: 0 },
    visible: {
      opacity: [0.1, 0.6, 0.1],
      transition: { duration: 3, repeat: Infinity } as any
    }
  };

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 800 500" className="w-full h-full drop-shadow-2xl overflow-visible">
        <defs>
          <filter id="satGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Beams to earth */}
        <motion.g variants={pulseParams} initial="hidden" animate="visible">
          <polygon points="400,300 250,500 550,500" fill="url(#beamGradient)" opacity="0.3" />
          <polygon points="400,300 350,500 450,500" fill="rgba(59,130,246,0.3)" filter="url(#satGlow)" />
        </motion.g>

        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.8)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
        </defs>

        {/* Satellite Wireframe */}
        <motion.g
          stroke="rgba(59, 130, 246, 0.8)" // Bright blue stroke
          strokeWidth="2"
          fill="none"
          initial="hidden"
          animate="visible"
          filter="url(#satGlow)"
        >
          {/* Main Body (Hexagon/Cylinder shape) */}
          <motion.path variants={drawParams} d="M360,180 L440,180 L460,240 L340,240 Z" />
          <motion.path variants={drawParams} d="M360,240 L440,240 L420,300 L380,300 Z" />
          <motion.path variants={drawParams} d="M360,180 L360,240" />
          <motion.path variants={drawParams} d="M440,180 L440,240" />
          
          {/* Top Antenna/Dish */}
          <motion.path variants={drawParams} d="M400,180 L400,120" />
          <motion.ellipse variants={drawParams} cx="400" cy="120" rx="40" ry="15" />
          <motion.circle variants={drawParams} cx="400" cy="120" r="3" fill="#fff" />
          <motion.path variants={drawParams} d="M400,120 L400,105" />

          {/* Left Solar Panel Array */}
          <motion.path variants={drawParams} d="M340,210 L280,210 L260,150 L100,150 L120,270 L280,270 L300,210" />
          {/* Panel Grid Left */}
          <motion.path variants={drawParams} d="M140,150 L160,270" />
          <motion.path variants={drawParams} d="M180,150 L200,270" />
          <motion.path variants={drawParams} d="M220,150 L240,270" />
          <motion.path variants={drawParams} d="M110,210 L270,210" />

          {/* Right Solar Panel Array */}
          <motion.path variants={drawParams} d="M460,210 L520,210 L540,150 L700,150 L680,270 L520,270 L500,210" />
          {/* Panel Grid Right */}
          <motion.path variants={drawParams} d="M580,150 L560,270" />
          <motion.path variants={drawParams} d="M620,150 L600,270" />
          <motion.path variants={drawParams} d="M660,150 L640,270" />
          <motion.path variants={drawParams} d="M530,210 L690,210" />
        </motion.g>

        {/* Data Nodes & Connections */}
        <g>
          {/* Lat/Lon Node */}
          <motion.path custom={0} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M400,100 L450,40" />
          <motion.circle custom={0} variants={nodeParams} initial="hidden" animate="visible" cx="400" cy="100" r="5" fill="#3b82f6" filter="url(#satGlow)" className="glow-point" />
          <motion.circle custom={0} variants={nodeParams} initial="hidden" animate="visible" cx="450" cy="40" r="3" fill="#fff" />
          <text x="460" y="45" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.5s'}}>LAT / LON ACTIVE</text>

          {/* Signal Strength Node */}
          <motion.path custom={1} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M280,210 L200,100" />
          <motion.circle custom={1} variants={nodeParams} initial="hidden" animate="visible" cx="280" cy="210" r="5" fill="#14b8a6" filter="url(#satGlow)" className="glow-point" />
          <motion.circle custom={1} variants={nodeParams} initial="hidden" animate="visible" cx="200" cy="100" r="3" fill="#fff" />
          <text x="210" y="95" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.6s'}}>Uplink Integrity: 98%</text>

          {/* Telemetry Node */}
          <motion.path custom={2} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M520,210 L600,100" />
          <motion.circle custom={2} variants={nodeParams} initial="hidden" animate="visible" cx="520" cy="210" r="5" fill="#8b5cf6" filter="url(#satGlow)" className="glow-point" />
          <motion.circle custom={2} variants={nodeParams} initial="hidden" animate="visible" cx="600" cy="100" r="3" fill="#fff" />
          <text x="610" y="95" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.7s'}}>MQTT Packets/sec: 42</text>

          {/* Fleet Status Node */}
          <motion.path custom={3} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M420,300 L550,300" />
          <motion.circle custom={3} variants={nodeParams} initial="hidden" animate="visible" cx="420" cy="300" r="5" fill="#f43f5e" filter="url(#satGlow)" className="glow-point" />
          <motion.circle custom={3} variants={nodeParams} initial="hidden" animate="visible" cx="550" cy="300" r="3" fill="#fff" />
          <text x="560" y="305" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.8s'}}>Tracking 54 Vehicles</text>

          {/* Sync Node */}
          <motion.path custom={4} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M380,300 L250,300" />
          <motion.circle custom={4} variants={nodeParams} initial="hidden" animate="visible" cx="380" cy="300" r="5" fill="#eab308" filter="url(#satGlow)" className="glow-point" />
          <motion.circle custom={4} variants={nodeParams} initial="hidden" animate="visible" cx="250" cy="300" r="3" fill="#fff" />
          <text x="110" y="305" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.9s'}}>Latency: 12ms</text>
        </g>
      </svg>
    </div>
  );
}
