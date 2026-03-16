"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  MapPin,
  Compass,
  Globe,
  AlertTriangle,
  DollarSign,
  Target,
  Clock,
  Eye,
  Car,
  ArrowRight,
  CheckCircle,
  Zap,
  Route,
  Map as MapIcon,
  Bell,
  Layers,
  ChevronRight,
  Satellite,
  LocateFixed,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WireframeSatellite } from "@/components/ui/wireframe-satellite";
import { WireframeTruck } from "@/components/ui/wireframe-truck";
import { GlowingRoute } from "@/components/ui/glowing-route";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function GPSTrackingPage() {
  const trackingFeatures = [
    {
      icon: LocateFixed,
      title: "Real-Time Vehicle Location",
      description:
        "See every vehicle on a live map — updated every few seconds. Know exactly where each driver is, not where they say they are.",
      gradient: "from-blue-500 to-cyan-500",
      color: "blue"
    },
    {
      icon: Route,
      title: "Live Route Tracking",
      description:
        "Watch vehicles move along their routes in real-time. See trails, speed, and direction. Verify that drivers are following planned routes.",
      gradient: "from-teal-500 to-emerald-500",
      color: "teal"
    },
    {
      icon: Target,
      title: "Geofence Alerts",
      description:
        "Draw zones on the map — depots, client sites, restricted areas. Get instant alerts when a vehicle enters or leaves. Know if drivers go off-route.",
      gradient: "from-purple-500 to-violet-500",
      color: "purple"
    },
    {
      icon: Clock,
      title: "Trip History & Replay",
      description:
        "Replay any completed trip on the map. See start time, end time, stops, speed changes, and harsh events. Complete digital logbook — automatically.",
      gradient: "from-amber-500 to-orange-500",
      color: "amber"
    },
    {
      icon: Bell,
      title: "Instant Notifications",
      description:
        "Speed limit violations, after-hours usage, geofence breaches, and unauthorized detours — get alerted via email or WhatsApp the moment it happens.",
      gradient: "from-rose-500 to-red-500",
      color: "rose"
    },
    {
      icon: Layers,
      title: "Trip Planning & Dispatch",
      description:
        "Plan multi-stop routes with waypoints, assign them to vehicles, and track completion in real-time. Know when the driver arrives at each stop.",
      gradient: "from-indigo-500 to-blue-500",
      color: "indigo"
    },
  ];

  const useCases = [
    {
      title: "Delivery & Logistics",
      description: "Track every delivery in real-time. Prove arrival times, optimize routes, and ensure loads arrive safely.",
      icon: Car,
      stats: ["50+ live vehicles", "Real-time ETA", "Proof of delivery"],
      color: "blue"
    },
    {
      title: "Field Services",
      description: "Know which technician is closest to a new job. Reduce response times and increase daily job completion.",
      icon: Compass,
      stats: ["Nearest driver dispatch", "Time on-site tracking", "Route optimization"],
      color: "teal"
    },
    {
      title: "Long-Haul Transport",
      description: "Monitor cross-country routes, rest stops, border crossings, and fuel consumption for long-distance fleets.",
      icon: Globe,
      stats: ["Cross-border tracking", "Rest compliance", "Fuel monitoring"],
      color: "indigo"
    },
    {
      title: "Construction & Mining",
      description: "Track heavy vehicles on remote sites. Monitor unauthorized use, idle time, and ensure site safety compliance.",
      icon: Target,
      stats: ["Site geofencing", "Idle time tracking", "After-hours alerts"],
      color: "amber"
    },
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
          <Link href="/" className="flex items-center gap-3 glass-card px-4 py-2 rounded-xl border-blue-500/20">
            <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-widest">
              TREKAMAN
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/fleet-telematics" className="hidden sm:inline text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors">
              Fleet Telematics
            </Link>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400/50">
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium mb-8 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <Satellite className="h-4 w-4 animate-pulse" />
              GPS + MQTT Real-Time Fleet Tracking Active
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              See Every Vehicle.
              <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mt-2">
                Every Second. Everywhere.
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 leading-relaxed font-light">
              TREKAMAN puts your entire fleet on a live map. Track location, speed, routes, and stops in real-time.
              Get alerts when vehicles go where they shouldn't. <strong className="text-blue-300 font-semibold">No more guessing where your drivers are.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-5 mb-12">
              <Link href="/login">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-slate-950 font-bold px-8 py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2 border border-blue-300/50"
                >
                  Deploy Tracking Tracker
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-7 text-lg rounded-xl flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors bg-slate-900/50 backdrop-blur-sm">
                  <MapIcon className="h-5 w-5 text-blue-500" />
                  Explore Features
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Visual: Satellite & Truck Tracking */}
          <div className="relative h-[500px] lg:h-[600px] w-full flex flex-col items-center justify-between py-10">
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
            
            {/* Satellite at top */}
            <div className="w-full max-w-[280px] z-20 relative transform translate-y-[-20px]">
               <WireframeSatellite className="w-full h-auto drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
               {/* Vertical target beam from satellite to truck */}
               <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-[2px] h-[300px] bg-gradient-to-b from-blue-400 to-transparent opacity-30 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
               <motion.div 
                 initial={{ opacity: 0, y: 0 }}
                 animate={{ opacity: [0, 1, 0], y: [0, 200] }}
                 transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                 className="absolute top-[80%] left-1/2 -translate-x-1/2 w-[4px] h-[30px] bg-blue-300 rounded-full shadow-[0_0_15px_rgba(147,197,253,1)]"
               />
               
               {/* Animated rings around satellite */}
               <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.5, 2] }}
                 transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-blue-400/30 rounded-full -z-10"
               />
            </div>

            {/* Truck at bottom receiving signal */}
            <div className="w-full max-w-[350px] z-10 mt-auto relative transform translate-y-[20px]">
                {/* Simulated ground line */}
                <div className="absolute inset-x-0 bottom-6 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-0"></div>
                <WireframeTruck className="w-full h-auto opacity-70" />
                
                {/* Lock icon next to truck */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 glass-card px-3 py-1.5 rounded-lg border-emerald-500/30 flex items-center gap-2 text-xs font-mono text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <LocateFixed className="h-3 w-3 animate-pulse" /> LOCKED
                </div>
            </div>
          </div>
        </motion.main>

        {/* ─── Why You Need GPS Tracking ─── */}
        <section className="border-t border-slate-800 bg-slate-900/40 backdrop-blur-md py-24 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">
                Without GPS Tracking, You're <span className="text-rose-400 glow-text">Losing Control.</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                Every fleet manager knows these problems — most don't know how easy they are to solve.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                {
                  icon: DollarSign,
                  title: "Fuel Theft & Misuse",
                  desc: "Unauthorized trips, personal use of company vehicles, and excessive idling drain your fuel budget.",
                  color: "rose",
                },
                {
                  icon: Clock,
                  title: "Time Theft",
                  desc: "Drivers claiming hours they didn't work, taking longer routes, or sitting at stops for too long.",
                  color: "amber",
                },
                {
                  icon: AlertTriangle,
                  title: "No Proof of Service",
                  desc: "Customers claim the driver never showed up. Without GPS proof, you can't dispute it.",
                  color: "orange",
                },
                {
                  icon: Eye,
                  title: "Zero Real-Time Visibility",
                  desc: "When a customer calls asking 'where's my delivery?', you have to phone the driver and hope they answer.",
                  color: "blue",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className={`glass-card rounded-2xl p-6 h-full border-${item.color}-500/20 hover:border-${item.color}-500/40 transition-all group overflow-hidden relative`}>
                    <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${item.color}-500/10 blur-[30px] rounded-full group-hover:bg-${item.color}-500/20 transition-all`} />
                    <div className="relative z-10">
                        <div className={`p-3 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 w-fit mb-5 shadow-[0_0_15px_rgba(var(--${item.color}-500),0.1)]`}>
                          <item.icon className={`h-5 w-5 text-${item.color}-400`} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-slate-200 transition-colors">{item.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed font-light">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="py-24 border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm relative">
            <div className="absolute right-0 bottom-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Everything You Need to{" "}
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent glow-text">
                  Control Your Fleet.
                </span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                From live tracking to trip history, geofences to dispatch — one platform does it all.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {trackingFeatures.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="h-full glass-card border border-slate-800 p-0 rounded-2xl transition-all group overflow-hidden">
                    <div className={`h-1 w-full bg-gradient-to-r ${feature.gradient}`} />
                    <div className="p-8">
                      <div className={`p-4 rounded-xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 w-fit mb-6 shadow-[0_0_15px_rgba(var(--${feature.color}-500),0.1)]`}>
                        <feature.icon className={`h-6 w-6 text-${feature.color}-400`} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-slate-200 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-slate-400 text-sm font-light leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Use Cases ─── */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Built for Every Type of Fleet.
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light">
                Whether you run 5 bakkies or 500 trucks, TREKAMAN scales with you.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {useCases.map((uc, i) => (
                <motion.div
                  key={uc.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="glass-card h-full p-8 rounded-2xl border-slate-800 hover:border-slate-700 transition-colors group">
                    <div className="flex items-start gap-5">
                      <div className={`p-4 rounded-xl bg-${uc.color}-500/10 border border-${uc.color}-500/20 flex-shrink-0 shadow-[0_0_15px_rgba(var(--${uc.color}-500),0.1)]`}>
                        <uc.icon className={`h-6 w-6 text-${uc.color}-400`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-3">{uc.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed font-light mb-5">{uc.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {uc.stats.map((stat) => (
                            <span
                              key={stat}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 bg-${uc.color}-500/10 border border-${uc.color}-500/20 rounded-lg text-xs font-medium text-${uc.color}-300`}
                            >
                              <CheckCircle className={`h-3.5 w-3.5 text-${uc.color}-400`} />
                              {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="py-24 border-t border-slate-800 bg-slate-900/40 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Up and Running in 3 Steps.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "01",
                  title: "Install the Device",
                  desc: "Plug the custom TREKAMAN tracker into your vehicle's OBD-II port to get data from OBD-II, or use a Teltonika device. Takes less than 5 minutes.",
                  icon: Zap,
                  color: "teal",
                },
                {
                  step: "02",
                  title: "Add the Vehicle",
                  desc: "Register the vehicle in TREKAMAN, assign a driver, and set up your geofences. Done in 2 minutes.",
                  icon: Smartphone,
                  color: "blue",
                },
                {
                  step: "03",
                  title: "Track Everything",
                  desc: "Open your dashboard. See every vehicle on the map. Get alerts. Review trips. Start saving money immediately.",
                  icon: MapIcon,
                  color: "indigo",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="text-center group"
                >
                  <div className="relative mb-8 mt-4">
                     <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-${item.color}-500/10 blur-xl rounded-full group-hover:bg-${item.color}-500/20 transition-all`} />
                     <div className={`relative w-20 h-20 rounded-2xl glass-card border-${item.color}-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(var(--${item.color}-500),0.15)]`}>
                        <item.icon className={`h-10 w-10 text-${item.color}-400`} />
                     </div>
                     <div className={`absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-slate-900 border border-${item.color}-500/50 flex items-center justify-center text-sm font-black text-${item.color}-400 shadow-lg`}>
                        {item.step}
                     </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-light">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-20 relative px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="container mx-auto max-w-6xl"
          >
            <div className="glass-card rounded-3xl p-[1px] border border-blue-500/30 animated-pulse-border overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-slate-900/80 -z-10" />
               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMG0tMjggMGEyOCAyOCAwIDEgMCA1NiAwYTI4IDI4IDAgMSAwLTU2IDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoNTksMTMwLDI0NiwwLjE1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50 -z-10" />
               
               <div className="relative p-12 md:p-20 text-center bg-slate-950/50 backdrop-blur-xl rounded-3xl z-10">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                  Take Control of Your Fleet Today.
                </h2>
                <p className="text-blue-100/70 mb-10 text-lg max-w-2xl mx-auto font-light">
                  Every day without GPS tracking is a day you're losing money to fuel waste, unauthorized trips, and missed deliveries.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-8 py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center gap-2"
                    >
                      Start Free Trial <Zap className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                  <Link href="/fleet-telematics">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-7 text-lg rounded-xl flex items-center gap-2 bg-slate-900/50"
                    >
                      Learn About Telematics <ChevronRight className="h-5 w-5 ml-1" />
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
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-slate-300 tracking-wider">TREKAMAN</span>
          </div>
          <p className="text-sm font-light">© {new Date().getFullYear()} TREKAMAN Core Protocol. All data secured.</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm font-medium">
            <Link href="/" className="hover:text-slate-300 transition-colors">Uplink (Home)</Link>
            <Link href="/fleet-telematics" className="hover:text-slate-300 transition-colors">Telematics</Link>
            <Link href="/gps-tracking" className="text-blue-400 hover:text-blue-300 transition-colors">GPS Tracking</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Auth Terminal</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
