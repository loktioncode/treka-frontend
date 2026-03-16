"use client";

import { motion } from "framer-motion";

export function EcuChipVisualization({ className = "" }: { className?: string }) {
  // Data connection lines that flow into the chip
  const dataLines = [
    { path: "M-100,-50 L-20,-50 L0,-30", delay: 0 },
    { path: "M-120,0 L-40,0 L-10,-10", delay: 0.5 },
    { path: "M-100,50 L-30,50 L-10,30", delay: 1 },
    { path: "M-80,-80 L-10,-80 L10,-60", delay: 1.5 },
  ];

  // Data connection lines flowing out
  const outLines = [
    { path: "M150,30 L180,30 L200,50", delay: 0.2 },
    { path: "M160,0 L210,0 L230,-20", delay: 0.7 },
    { path: "M150,-30 L170,-30 L190,-10", delay: 1.2 },
    { path: "M140,-60 L190,-60 L210,-80", delay: 1.7 },
  ];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="-150 -150 400 300"
        className="w-full h-full overflow-visible"
        style={{ filter: "drop-shadow(0px 0px 20px rgba(45, 212, 191, 0.2))" }}
      >
        {/* Background glow for the chip */}
        <circle cx="75" cy="0" r="80" fill="url(#chipGlow)" opacity="0.5" />

        {/* Input Data Lines */}
        {dataLines.map((line, i) => (
          <g key={`in-${i}`}>
            <path
              d={line.path}
              fill="none"
              stroke="rgba(45, 212, 191, 0.2)"
              strokeWidth="2"
            />
            {/* Animated flowing data packet */}
            <motion.circle
              r="3"
              fill="#2dd4bf"
              style={{ filter: "drop-shadow(0 0 5px #2dd4bf)" }}
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                delay: line.delay,
              }}
            >
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path={line.path}
                begin={`${line.delay}s`}
              />
            </motion.circle>
          </g>
        ))}

        {/* Output Data Lines */}
        {outLines.map((line, i) => (
          <g key={`out-${i}`}>
            <path
              d={line.path}
              fill="none"
              stroke="rgba(59, 130, 246, 0.3)"
              strokeWidth="2"
            />
            {/* Animated flowing data packet */}
            <motion.circle
              r="3"
              fill="#3b82f6"
              style={{ filter: "drop-shadow(0 0 5px #3b82f6)" }}
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear",
                delay: line.delay,
              }}
            >
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                path={line.path}
                begin={`${line.delay}s`}
              />
            </motion.circle>
          </g>
        ))}

        {/* The Main ECU Chip */}
        <g transform="translate(25, -50)">
          {/* Outer casing */}
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            rx="12"
            fill="rgba(15, 23, 42, 0.9)"
            stroke="#2dd4bf"
            strokeWidth="2"
          />
          {/* Inner core */}
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            rx="8"
            fill="rgba(45, 212, 191, 0.1)"
            stroke="#14b8a6"
            strokeWidth="1"
          />
          
          {/* Core Processing Unit (Pulsing) */}
          <motion.rect
            x="35"
            y="35"
            width="30"
            height="30"
            rx="4"
            fill="#2dd4bf"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 10px #2dd4bf)" }}
          />

          {/* Chip Pins */}
          {Array.from({ length: 6 }).map((_, i) => (
            <g key={`pins-${i}`}>
              {/* Top pins */}
              <line x1={15 + i * 14} y1="0" x2={15 + i * 14} y2="-8" stroke="#2dd4bf" strokeWidth="2" />
              {/* Bottom pins */}
              <line x1={15 + i * 14} y1="100" x2={15 + i * 14} y2="108" stroke="#2dd4bf" strokeWidth="2" />
              {/* Left pins */}
              <line x1="0" y1={15 + i * 14} x2="-8" y2={15 + i * 14} stroke="#2dd4bf" strokeWidth="2" />
              {/* Right pins */}
              <line x1="100" y1={15 + i * 14} x2="108" y2={15 + i * 14} stroke="#2dd4bf" strokeWidth="2" />
            </g>
          ))}

          {/* Data labels on chip */}
          <text x="50" y="12" fill="#2dd4bf" fontSize="8" textAnchor="middle" className="font-mono tracking-widest opacity-70">
            TREKAMAN
          </text>
          <text x="50" y="94" fill="#2dd4bf" fontSize="8" textAnchor="middle" className="font-mono tracking-widest opacity-70">
            CORE-V1
          </text>
        </g>

        {/* Floating Data Nodes */}
        <motion.g
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="-100" y="-70" width="40" height="20" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#2dd4bf" strokeWidth="1" />
          <text x="-80" y="-56" fill="#2dd4bf" fontSize="8" textAnchor="middle" className="font-mono">RPM</text>
        </motion.g>

        <motion.g
          animate={{ y: [5, -5, 5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <rect x="-120" y="20" width="45" height="20" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#2dd4bf" strokeWidth="1" />
          <text x="-97" y="34" fill="#2dd4bf" fontSize="8" textAnchor="middle" className="font-mono">FUEL</text>
        </motion.g>

        <motion.g
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <rect x="180" y="-40" width="50" height="20" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#3b82f6" strokeWidth="1" />
          <text x="205" y="-26" fill="#3b82f6" fontSize="8" textAnchor="middle" className="font-mono">CLOUD</text>
        </motion.g>

        {/* New Speed Node */}
        <motion.g
          animate={{ x: [-2, 2, -2] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        >
          <rect x="-90" y="-120" width="45" height="20" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#2dd4bf" strokeWidth="1" />
          <text x="-67" y="-106" fill="#2dd4bf" fontSize="8" textAnchor="middle" className="font-mono">SPEED</text>
        </motion.g>

        {/* New GPS Node */}
        <motion.g
          animate={{ x: [2, -2, 2] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        >
          <rect x="50" y="-130" width="60" height="20" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#3b82f6" strokeWidth="1" />
          <text x="80" y="-116" fill="#3b82f6" fontSize="8" textAnchor="middle" className="font-mono">LAT/LON</text>
        </motion.g>

        {/* Gradients */}
        <defs>
          <radialGradient id="chipGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(45, 212, 191, 0.3)" />
            <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
