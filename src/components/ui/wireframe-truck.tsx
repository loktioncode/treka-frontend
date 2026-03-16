import { motion, Variants } from "framer-motion";

export function WireframeTruck({ 
  className = "",
  style,
}: { 
  className?: string;
  style?: React.CSSProperties;
}) {
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

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-2xl overflow-visible" style={style}>
        <defs>
          <filter id="truckGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Chassis & Body Wireframe */}
        <motion.g
          stroke="rgba(45, 212, 191, 0.4)"
          strokeWidth="1.5"
          fill="none"
          initial="hidden"
          animate="visible"
          filter="url(#truckGlow)"
        >
          {/* Main Box */}
          <motion.path variants={drawParams} d="M150,220 L150,80 L600,80 L600,220 Z" />
          <motion.path variants={drawParams} d="M170,240 L170,100 L620,100 L620,240 Z" />
          <motion.path variants={drawParams} d="M150,80 L170,100" />
          <motion.path variants={drawParams} d="M600,80 L620,100" />
          <motion.path variants={drawParams} d="M600,220 L620,240" />
          <motion.path variants={drawParams} d="M150,220 L170,240" />
          
          {/* Cab */}
          <motion.path variants={drawParams} d="M600,120 L680,120 L720,180 L720,220 L600,220 Z" />
          <motion.path variants={drawParams} d="M620,140 L700,140 L740,200 L740,240 L620,240 Z" />
          <motion.path variants={drawParams} d="M600,120 L620,140" />
          <motion.path variants={drawParams} d="M680,120 L700,140" />
          <motion.path variants={drawParams} d="M720,180 L740,200" />
          <motion.path variants={drawParams} d="M720,220 L740,240" />
          
          {/* Wheels Inner/Outer */}
          <motion.circle variants={drawParams} cx="250" cy="240" r="30" />
          <motion.circle variants={drawParams} cx="250" cy="240" r="15" />
          <motion.circle variants={drawParams} cx="450" cy="240" r="30" />
          <motion.circle variants={drawParams} cx="450" cy="240" r="15" />
          <motion.circle variants={drawParams} cx="660" cy="240" r="30" />
          <motion.circle variants={drawParams} cx="660" cy="240" r="15" />
          
          {/* Wheel connections to frame */}
          <motion.path variants={drawParams} d="M220,240 L170,240" />
          <motion.path variants={drawParams} d="M280,240 L420,240" />
          <motion.path variants={drawParams} d="M480,240 L630,240" />
          <motion.path variants={drawParams} d="M690,240 L740,240" />
        </motion.g>

        {/* Data Nodes — spread across truck */}
        <g>
          {/* Left cargo area — Cargo Temp */}
          <motion.path custom={0} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M250,120 L180,40" />
          <motion.circle custom={0} variants={nodeParams} initial="hidden" animate="visible" cx="250" cy="120" r="5" fill="#8b5cf6" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={0} variants={nodeParams} initial="hidden" animate="visible" cx="180" cy="40" r="3" fill="#fff" />
          <text x="50" y="40" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.5s'}}>Cargo Temp: -4.2°C</text>

          {/* Mid body — Fuel Level */}
          <motion.path custom={1} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M390,150 L390,40" />
          <motion.circle custom={1} variants={nodeParams} initial="hidden" animate="visible" cx="390" cy="150" r="5" fill="#f59e0b" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={1} variants={nodeParams} initial="hidden" animate="visible" cx="390" cy="40" r="3" fill="#fff" />
          <text x="340" y="32" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.7s'}}>Fuel: 42% (210L)</text>

          {/* Right of cargo body — Speed */}
          <motion.path custom={2} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M530,100 L560,30" />
          <motion.circle custom={2} variants={nodeParams} initial="hidden" animate="visible" cx="530" cy="100" r="5" fill="#14b8a6" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={2} variants={nodeParams} initial="hidden" animate="visible" cx="560" cy="30" r="3" fill="#fff" />
          <text x="570" y="35" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.9s'}}>Speed: 82 km/h</text>

          {/* Cab — Engine Load */}
          <motion.path custom={3} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M660,160 L760,80" />
          <motion.circle custom={3} variants={nodeParams} initial="hidden" animate="visible" cx="660" cy="160" r="5" fill="#3b82f6" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={3} variants={nodeParams} initial="hidden" animate="visible" cx="760" cy="80" r="3" fill="#fff" />
          <text x="765" y="80" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.1s'}}>Engine Load: 65%</text>

          {/* Rear wheel — GPS */}
          <motion.path custom={4} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M450,240 L390,320" />
          <motion.circle custom={4} variants={nodeParams} initial="hidden" animate="visible" cx="450" cy="240" r="5" fill="#ec4899" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={4} variants={nodeParams} initial="hidden" animate="visible" cx="390" cy="320" r="3" fill="#fff" />
          <text x="290" y="335" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.3s'}}>GPS: 12 Sats Lock</text>
        </g>
      </svg>
    </div>
  );
}
