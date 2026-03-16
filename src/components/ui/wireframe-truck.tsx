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

        {/* Data Nodes & Connections */}
        <g>
          {/* Engine Node 1: Engine Load */}
          <motion.path custom={0} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M650,180 L750,100" />
          <motion.circle custom={0} variants={nodeParams} initial="hidden" animate="visible" cx="650" cy="180" r="5" fill="#3b82f6" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={0} variants={nodeParams} initial="hidden" animate="visible" cx="750" cy="100" r="3" fill="#fff" />
          <text x="760" y="105" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.5s'}}>Engine Load: 65%</text>

          {/* Engine Node 2: RPM */}
          <motion.path custom={5} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M630,150 L700,50" />
          <motion.circle custom={5} variants={nodeParams} initial="hidden" animate="visible" cx="630" cy="150" r="4" fill="#6366f1" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={5} variants={nodeParams} initial="hidden" animate="visible" cx="700" cy="50" r="3" fill="#fff" />
          <text x="710" y="55" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.0s'}}>RPM: 2150</text>

          {/* Engine Node 3: Coolant Temp */}
          <motion.path custom={6} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M670,140 L780,140" />
          <motion.circle custom={6} variants={nodeParams} initial="hidden" animate="visible" cx="670" cy="140" r="4" fill="#ef4444" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={6} variants={nodeParams} initial="hidden" animate="visible" cx="780" cy="140" r="3" fill="#fff" />
          <text x="790" y="145" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.1s'}}>Coolant: 85°C</text>

          {/* Speed/Transmission Node */}
          <motion.path custom={1} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M660,240 L780,240" />
          <motion.circle custom={1} variants={nodeParams} initial="hidden" animate="visible" cx="660" cy="240" r="5" fill="#14b8a6" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={1} variants={nodeParams} initial="hidden" animate="visible" cx="780" cy="240" r="3" fill="#fff" />
          <text x="790" y="245" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.6s'}}>Speed: 82 km/h</text>

          {/* Throttle Position Node */}
          <motion.path custom={7} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M620,200 L730,280" />
          <motion.circle custom={7} variants={nodeParams} initial="hidden" animate="visible" cx="620" cy="200" r="4" fill="#2dd4bf" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={7} variants={nodeParams} initial="hidden" animate="visible" cx="730" cy="280" r="3" fill="#fff" />
          <text x="740" y="285" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.2s'}}>Throttle: 42%</text>

          {/* Battery Voltage Node */}
          <motion.path custom={8} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M600,180 L550,320" />
          <motion.circle custom={8} variants={nodeParams} initial="hidden" animate="visible" cx="600" cy="180" r="4" fill="#eab308" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={8} variants={nodeParams} initial="hidden" animate="visible" cx="550" cy="320" r="3" fill="#fff" />
          <text x="560" y="325" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.3s'}}>Battery: 28.2V</text>

          {/* Fuel Node */}
          <motion.path custom={2} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M400,200 L450,280" />
          <motion.circle custom={2} variants={nodeParams} initial="hidden" animate="visible" cx="400" cy="200" r="5" fill="#f59e0b" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={2} variants={nodeParams} initial="hidden" animate="visible" cx="450" cy="280" r="3" fill="#fff" />
          <text x="460" y="285" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.7s'}}>Fuel: 42% (210L)</text>
          
          {/* Intake Air Node */}
          <motion.path custom={9} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M680,160 L800,180" />
          <motion.circle custom={9} variants={nodeParams} initial="hidden" animate="visible" cx="680" cy="160" r="3" fill="#06b6d4" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={9} variants={nodeParams} initial="hidden" animate="visible" cx="800" cy="180" r="3" fill="#fff" />
          <text x="810" y="185" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '3.4s'}}>Intake: 32°C</text>

          {/* Payload/Temp Node */}
          <motion.path custom={3} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M300,150 L250,50" />
          <motion.circle custom={3} variants={nodeParams} initial="hidden" animate="visible" cx="300" cy="150" r="5" fill="#8b5cf6" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={3} variants={nodeParams} initial="hidden" animate="visible" cx="250" cy="50" r="3" fill="#fff" />
          <text x="120" y="55" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.8s'}}>Cargo Temp: -4.2°C</text>

          {/* Location Node */}
          <motion.path custom={4} variants={lineParams} initial="hidden" animate="visible" stroke="#fff" strokeWidth="1" strokeDasharray="4 4" fill="none" d="M500,80 L550,20" />
          <motion.circle custom={4} variants={nodeParams} initial="hidden" animate="visible" cx="500" cy="80" r="5" fill="#ec4899" filter="url(#truckGlow)" className="glow-point" />
          <motion.circle custom={4} variants={nodeParams} initial="hidden" animate="visible" cx="550" cy="20" r="3" fill="#fff" />
          <text x="560" y="25" fill="#94a3b8" fontSize="12" className="animate-in fade-in" style={{animationDelay: '2.9s'}}>GPS: 12 Sats Lock</text>
        </g>
      </svg>
    </div>
  );
}
