"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Fuel,
  Gauge,
  Thermometer,
  AlertTriangle,
  DollarSign,
  Wrench,
  Radio,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Zap,
  Clock,
  Activity,
  Target,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WireframeTruck } from "@/components/ui/wireframe-truck";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function FleetTelematicsPage() {
  const problems = [
    {
      icon: DollarSign,
      title: "Uncontrolled Fuel Costs",
      description:
        "Drivers wasting fuel through idling, harsh acceleration, and inefficient routes — and you only find out at month-end.",
      stat: "Up to 25%",
      statLabel: "fuel wasted by unmonitored fleets",
      color: "rose",
    },
    {
      icon: AlertTriangle,
      title: "Unexpected Breakdowns",
      description:
        "A vehicle breaks down on the highway. No warning. The load is late, the driver is stranded, and repair costs double.",
      stat: "R45,000+",
      statLabel: "average emergency roadside repair cost",
      color: "amber",
    },
    {
      icon: Shield,
      title: "Driver Safety Blind Spots",
      description:
        "Harsh braking, speeding, and erratic cornering go unreported until an accident costs lives and crushes your insurance.",
      stat: "37%",
      statLabel: "of fleet accidents are preventable",
      color: "orange",
    },
    {
      icon: Clock,
      title: "No Visibility Over Your Fleet",
      description:
        "You have no idea which vehicles are moving, which are idle, and whether drivers are on-route or off-task.",
      stat: "3+ hrs",
      statLabel: "daily lost to fleet coordination",
      color: "slate",
    },
  ];

  const solutions = [
    {
      icon: Gauge,
      title: "Live Engine & Speed Monitoring",
      description:
        "See every vehicle's speed, RPM, throttle position, and engine load in real-time. Know exactly how your vehicles are being driven — every second.",
      benefit: "Reduce speeding incidents by 60%",
      gradient: "from-teal-500 to-emerald-500",
      color: "teal"
    },
    {
      icon: Fuel,
      title: "Fuel Level & Consumption Tracking",
      description:
        "Live fuel level from the ECU DATA, not estimates. Detect fuel theft instantly. Track consumption per trip and identify your most and least efficient vehicles.",
      benefit: "Save 15-25% on fuel costs",
      gradient: "from-emerald-500 to-green-500",
      color: "emerald"
    },
    {
      icon: Thermometer,
      title: "Predictive Engine Health",
      description:
        "Coolant temperature, oil temperature, intake air, and battery voltage monitored continuously. Get warned before the engine overheats or the battery dies.",
      benefit: "Prevent 80% of roadside breakdowns",
      gradient: "from-blue-500 to-indigo-500",
      color: "blue"
    },
    {
      icon: Activity,
      title: "Driver Behavior Scoring",
      description:
        "Every harsh brake, aggressive acceleration, and hard corner is detected by our ECU DATA sensors. Drivers get scored, and you get a leaderboard to coach them.",
      benefit: "Reduce accidents by 40%",
      gradient: "from-purple-500 to-violet-500",
      color: "purple"
    },
    {
      icon: Wrench,
      title: "Maintenance Intelligence",
      description:
        "Engine load patterns, vibration data, and component health metrics tell you which vehicles need service — before they break down and cost you 10x more.",
      benefit: "Cut maintenance costs by 30%",
      gradient: "from-amber-500 to-orange-500",
      color: "amber"
    },
    {
      icon: BarChart3,
      title: "Fleet Analytics & Reports",
      description:
        "Automated trip reports with distance, fuel used, driver score, and route compliance. Export to PDF or view in-app. No more manual log books.",
      benefit: "Save 5+ hours per week on admin",
      gradient: "from-rose-500 to-pink-500",
      color: "rose"
    },
  ];

  const ecuDataPoints = [
    { name: "Vehicle Speed", source: "ECU DATA / GPS", icon: Gauge, status: "Active" },
    { name: "Engine RPM", source: "ECU DATA", icon: Activity, status: "Active" },
    { name: "Fuel Level", source: "ECU DATA", icon: Fuel, status: "Active" },
    { name: "Coolant Temperature", source: "ECU DATA", icon: Thermometer, status: "Active" },
    { name: "Battery Voltage", source: "ECU DATA", icon: Zap, status: "Active" },
    { name: "Engine Load", source: "ECU DATA", icon: Target, status: "Active" },
    { name: "Throttle Position", source: "ECU DATA", icon: Gauge, status: "Active" },
    { name: "Mass Air Flow", source: "ECU DATA", icon: Activity, status: "Active" },
    { name: "Oil Temperature", source: "ECU DATA", icon: Thermometer, status: "Active" },
    { name: "Intake Air Temp", source: "ECU DATA", icon: Thermometer, status: "Active" },
    { name: "Fuel Pressure", source: "ECU DATA", icon: Fuel, status: "Active" },
    { name: "Barometric Pressure", source: "ECU DATA", icon: Activity, status: "Active" },
    { name: "Harsh Braking", source: "ECU DATA Sensor", icon: AlertTriangle, status: "Event" },
    { name: "Hard Cornering", source: "ECU DATA Sensor", icon: AlertTriangle, status: "Event" },
    { name: "Road Quality", source: "ECU DATA Sensor", icon: Activity, status: "Analysis" },
    { name: "Roll & Pitch", source: "ECU DATA Sensor", icon: Target, status: "Safety" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-teal-500/30 overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 tech-grid-bg opacity-40" />

      <div className="relative z-10">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-4 py-8 flex justify-between items-center"
        >
          <Link href="/" className="flex items-center gap-3 glass-card px-4 py-2 rounded-xl border-teal-500/20">
            <div className="p-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg shadow-[0_0_10px_rgba(20,184,166,0.3)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-widest">
              TREKAMAN
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/gps-tracking" className="hidden sm:inline text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors">
              GPS Tracking
            </Link>
            <Link href="/login">
              <Button className="bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_15px_rgba(13,148,136,0.5)] border border-teal-400/50">
                LOGIN
              </Button>
            </Link>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-24 grid lg:grid-cols-2 gap-12 items-center container mx-auto px-4 pt-12 pb-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-teal-500/30 rounded-full text-teal-400 text-sm font-medium mb-8 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
              <Radio className="h-4 w-4 animate-pulse" />
              Active
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              Deep Telematics.
              <span className="block bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent mt-2">
                Absolute Fleet Control.
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 leading-relaxed font-light">
              TREKAMAN intercepts live data straight from your vehicle's engine control unit — speed, fuel, temperature,
              driver behaviour — converting raw telemetry into <strong className="text-teal-300 font-semibold">money-saving, breakdown-preventing</strong> intelligence.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 mb-12">
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold px-8 py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all flex items-center gap-2 border border-teal-300/50"
                >
                  Deploy Telematics
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-7 text-lg rounded-xl flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors bg-slate-900/50 backdrop-blur-sm">
                  <Activity className="h-5 w-5 text-teal-500" />
                  View the Data Layers
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Visual: Wireframe Truck */}
          <div className="relative h-[400px] lg:h-[500px] w-full flex items-center justify-center">
            {/* Ambient glow behind truck */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-teal-500/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute inset-x-0 bottom-10 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent z-0"></div>
            <WireframeTruck className="w-full max-w-lg z-10 drop-shadow-[0_0_15px_rgba(45,212,191,0.3)] opacity-90" />
          </div>
        </motion.main>

        {/* ─── The Problem ─── */}
        <section className="border-t border-slate-800 bg-slate-900/40 backdrop-blur-md py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">
                Blind Spots Cost <span className="text-rose-400 glow-text">Millions.</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                If you aren't monitoring the ECU, your vehicles are black boxes bleeding cash.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {problems.map((problem, i) => (
                <motion.div
                  key={problem.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className={`glass-card rounded-2xl p-8 h-full border-${problem.color}-500/20 hover:border-${problem.color}-500/40 transition-all group relative overflow-hidden`}>
                    <div className={`absolute -right-10 -top-10 w-40 h-40 bg-${problem.color}-500/10 blur-[50px] rounded-full group-hover:bg-${problem.color}-500/20 transition-all`} />
                    <div className="flex items-start gap-5 relative z-10">
                      <div className={`p-4 rounded-xl bg-${problem.color}-500/10 border border-${problem.color}-500/20 flex-shrink-0 shadow-[0_0_15px_rgba(var(--${problem.color}-500),0.1)]`}>
                        <problem.icon className={`h-6 w-6 text-${problem.color}-400`} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-slate-200 transition-colors">{problem.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6 font-light">{problem.description}</p>
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-black text-${problem.color}-400 glow-text`}>{problem.stat}</span>
                          <span className="text-xs text-slate-500 uppercase tracking-widest">{problem.statLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Data Points Grid ─── */}
        <section id="how-it-works" className="py-32 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                16+ Dimensional <span className="text-teal-400 glow-text">Telemetry.</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                Direct ECU interception and high-frequency sensor processing.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {ecuDataPoints.map((dp, i) => (
                <motion.div
                  key={dp.name}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="glass-card rounded-xl p-5 hover:bg-slate-800/80 transition-all border-teal-500/20 hover:border-teal-400/50 text-center group cursor-default relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2">
                    <span className="flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dp.status === 'Event' ? 'bg-amber-400' : 'bg-teal-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${dp.status === 'Event' ? 'bg-amber-500' : 'bg-teal-500'}`}></span>
                    </span>
                  </div>
                  <dp.icon className="h-6 w-6 text-teal-500 mx-auto mb-3 group-hover:text-teal-300 group-hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.8)] transition-all" />
                  <p className="text-sm font-bold text-white mb-1 group-hover:text-teal-100">{dp.name}</p>
                  <p className="text-[10px] text-teal-500/60 uppercase font-mono tracking-wider">{dp.source}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── The Solution ─── */}
        <section className="py-24 border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Actionable <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent glow-text">Intelligence.</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                Complex data rendered beautifully simple for immediate operational decisions.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {solutions.map((sol, i) => (
                <motion.div
                  key={sol.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="h-full glass-card border border-slate-800 p-0 rounded-2xl transition-all group overflow-hidden">
                    <div className={`h-1 w-full bg-gradient-to-r ${sol.gradient}`} />
                    <div className="p-8">
                      <div className={`p-4 rounded-xl bg-${sol.color}-500/10 border border-${sol.color}-500/20 w-fit mb-6 shadow-[0_0_15px_rgba(var(--${sol.color}-500),0.1)]`}>
                        <sol.icon className={`h-6 w-6 text-${sol.color}-400`} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-slate-200 transition-colors">
                        {sol.title}
                      </h3>
                      <p className="text-slate-400 text-sm font-light leading-relaxed mb-6">{sol.description}</p>
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-${sol.color}-500/10 border border-${sol.color}-500/20 rounded-lg w-full`}>
                        <CheckCircle className={`h-4 w-4 text-${sol.color}-400 flex-shrink-0`} />
                        <span className={`text-sm font-medium text-${sol.color}-300`}>{sol.benefit}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Compatible Devices ─── */}
        <section className="py-32">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="container mx-auto px-4 max-w-5xl"
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Hardware Agnostic.
              </h2>
              <p className="text-slate-400 text-lg font-light max-w-2xl mx-auto">
                Plug in our custom OBD-II scanner or connect your existing Teltonika devices via MQTT uplink.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Teltonika FMB/FMC",
                  desc: "Industry-standard trackers. Already have them? We integrate natively via Flespi MQTT.",
                  badge: "Enterprise Standard",
                  badgeColor: "teal",
                },
                {
                  title: "TREKAMAN Tracker",
                  desc: "Our custom OBD-II hardware reads 12+ engine PIDs and 6-axis IMU data. High frequency, low latency.",
                  badge: "Deep Integration",
                  badgeColor: "blue",
                },
                {
                  title: "Any MQTT Device",
                  desc: "Universal protocol support. Any GPS/telematics device broadcasting MQTT can push data to our ingestion layer.",
                  badge: "Unrestricted",
                  badgeColor: "purple",
                },
              ].map((device, i) => (
                <motion.div
                  key={device.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="glass-card h-full p-8 rounded-2xl border-slate-800 hover:border-slate-700 transition-colors group">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase mb-6 bg-${device.badgeColor}-500/10 text-${device.badgeColor}-400 border border-${device.badgeColor}-500/30 group-hover:bg-${device.badgeColor}-500/20 transition-colors`}>
                      {device.badge}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-3">{device.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed font-light">{device.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-20 relative px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="container mx-auto max-w-6xl"
          >
            <div className="glass-card rounded-3xl p-[1px] border border-teal-500/30 animated-pulse-border overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-900/60 to-slate-900/80 -z-10" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMG0tMjggMGEyOCAyOCAwIDEgMCA1NiAwYTI4IDI4IDAgMSAwLTU2IDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoNDUsMjEyLDE5MSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50 -z-10" />

              <div className="relative p-12 md:p-20 text-center bg-slate-950/50 backdrop-blur-xl rounded-3xl z-10">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                  Initialize Telematics Uplink.
                </h2>
                <p className="text-teal-100/70 mb-10 text-lg max-w-2xl mx-auto font-light">
                  Join fleet operators across South Africa saving R10,000+ per vehicle annually through deep ECU insights.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all flex items-center gap-2"
                    >
                      Establish Connection <Zap className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                  <Link href="/gps-tracking">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-7 text-lg rounded-xl flex items-center gap-2 bg-slate-900/50"
                    >
                      View GPS Module <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 py-10 text-center text-slate-500 relative z-20">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-teal-500" />
            <span className="font-bold text-slate-300 tracking-wider">TREKAMAN</span>
          </div>
          <p className="text-sm font-light">© {new Date().getFullYear()} TREKAMAN Core Protocol. All data secured.</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm font-medium">
            <Link href="/" className="hover:text-slate-300 transition-colors">Uplink (Home)</Link>
            <Link href="/fleet-telematics" className="text-teal-400 hover:text-teal-300 transition-colors">Telematics</Link>
            <Link href="/gps-tracking" className="hover:text-slate-300 transition-colors">GPS Tracking</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Login</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
