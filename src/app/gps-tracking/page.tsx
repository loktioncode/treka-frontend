"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  MapPin,
  Navigation,
  Compass,
  Globe,
  AlertTriangle,
  DollarSign,
  Target,
  Clock,
  Eye,
  Radio,
  Car,
  ArrowRight,
  CheckCircle,
  Zap,
  Route,
  Map as MapIcon,
  Bell,
  Layers,
  ChevronRight,
  Smartphone,
  Satellite,
  CircleDot,
  LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
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
    },
    {
      icon: Route,
      title: "Live Route Tracking",
      description:
        "Watch vehicles move along their routes in real-time. See trails, speed, and direction. Verify that drivers are following planned routes.",
      gradient: "from-teal-500 to-emerald-500",
    },
    {
      icon: Target,
      title: "Geofence Alerts",
      description:
        "Draw zones on the map — depots, client sites, restricted areas. Get instant alerts when a vehicle enters or leaves. Know if drivers go off-route.",
      gradient: "from-purple-500 to-violet-500",
    },
    {
      icon: Clock,
      title: "Trip History & Replay",
      description:
        "Replay any completed trip on the map. See start time, end time, stops, speed changes, and harsh events. Complete digital logbook — automatically.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Bell,
      title: "Instant Notifications",
      description:
        "Speed limit violations, after-hours usage, geofence breaches, and unauthorized detours — get alerted via email or WhatsApp the moment it happens.",
      gradient: "from-rose-500 to-red-500",
    },
    {
      icon: Layers,
      title: "Trip Planning & Dispatch",
      description:
        "Plan multi-stop routes with waypoints, assign them to vehicles, and track completion in real-time. Know when the driver arrives at each stop.",
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  const useCases = [
    {
      title: "Delivery & Logistics",
      description: "Track every delivery in real-time. Prove arrival times, optimize routes, and ensure loads arrive safely.",
      icon: Car,
      stats: ["50+ live vehicles", "Real-time ETA", "Proof of delivery"],
    },
    {
      title: "Field Services",
      description: "Know which technician is closest to a new job. Reduce response times and increase daily job completion.",
      icon: Compass,
      stats: ["Nearest driver dispatch", "Time on-site tracking", "Route optimization"],
    },
    {
      title: "Long-Haul Transport",
      description: "Monitor cross-country routes, rest stops, border crossings, and fuel consumption for long-distance fleets.",
      icon: Globe,
      stats: ["Cross-border tracking", "Rest compliance", "Fuel monitoring"],
    },
    {
      title: "Construction & Mining",
      description: "Track heavy vehicles on remote sites. Monitor unauthorized use, idle time, and ensure site safety compliance.",
      icon: Target,
      stats: ["Site geofencing", "Idle time tracking", "After-hours alerts"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-6 flex justify-between items-center"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            TREKAMAN
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/fleet-telematics" className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
            Fleet Telematics
          </Link>
          <Link href="/login">
            <Button>Start Free Trial</Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 rounded-full text-blue-700 text-sm font-medium mb-6">
            <Satellite className="h-4 w-4" />
            GPS + MQTT Real-Time Fleet Tracking
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            See Every Vehicle.
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Every Second. Everywhere.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            TREKAMAN puts your entire fleet on a live map. Track location, speed, routes, and stops in real-time.
            Get alerts when vehicles go where they shouldn&apos;t. <strong>No more guessing where your drivers are.</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Track Your Fleet Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { number: "< 5s", label: "Location Update Speed" },
              { number: "100%", label: "Route Visibility" },
              { number: "24/7", label: "Automated Tracking" },
              { number: "∞", label: "Trip History" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-center"
              >
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{stat.number}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Why You Need GPS Tracking ─── */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Without GPS Tracking, You&apos;re <span className="text-red-400">Losing Control</span>
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Every fleet manager knows these problems — most don&apos;t know how easy they are to solve
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: DollarSign,
                title: "Fuel Theft & Misuse",
                desc: "Unauthorized trips, personal use of company vehicles, and excessive idling drain your fuel budget.",
                color: "red",
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
                <Card className="bg-slate-800/80 border-slate-700 h-full hover:border-slate-600 transition-colors">
                  <CardContent className="p-5">
                    <div className={`p-2.5 rounded-xl bg-${item.color}-500/20 w-fit mb-3`}>
                      <item.icon className={`h-5 w-5 text-${item.color}-400`} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Control Your Fleet
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            From live tracking to trip history, geofences to dispatch — one platform does it all
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {trackingFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-2 bg-gradient-to-r ${feature.gradient}`} />
                  <div className="p-6">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.gradient} w-fit mb-4 shadow-md`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50/40 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Every Type of Fleet
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Whether you run 5 bakkies or 500 trucks, TREKAMAN scales with you
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
                <Card className="h-full hover:shadow-lg transition-shadow border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-100 flex-shrink-0">
                        <uc.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{uc.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-3">{uc.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {uc.stats.map((stat) => (
                            <span
                              key={stat}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                              {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Up and Running in 3 Steps
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              step: "1",
              title: "Install the Device",
              desc: "Plug our tracking device into your vehicle's OBD-II port or wire a Teltonika tracker. Takes less than 5 minutes.",
              icon: Zap,
              color: "teal",
            },
            {
              step: "2",
              title: "Add the Vehicle",
              desc: "Register the vehicle in TREKAMAN, assign a driver, and set up your geofences. Done in 2 minutes.",
              icon: Smartphone,
              color: "blue",
            },
            {
              step: "3",
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
              className="text-center"
            >
              <div className={`w-16 h-16 rounded-2xl bg-${item.color}-100 flex items-center justify-center mx-auto mb-4`}>
                <item.icon className={`h-8 w-8 text-${item.color}-600`} />
              </div>
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-${item.color}-600 text-white text-sm font-bold mb-3`}>
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMG0tMjggMGEyOCAyOCAwIDEgMCA1NiAwYTI4IDI4IDAgMSAwLTU2IDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-30" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Take Control of Your Fleet Today
                </h2>
                <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
                  Every day without GPS tracking is a day you&apos;re losing money to fuel waste, unauthorized trips, and missed deliveries.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
                    >
                      Start Free Trial
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/fleet-telematics">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                    >
                      Learn About Telematics
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 text-center text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-4 w-4" />
          <span className="font-semibold">TREKAMAN</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} TREKAMAN Fleet Management. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-sm">
          <Link href="/" className="hover:text-teal-600 transition-colors">Home</Link>
          <Link href="/fleet-telematics" className="hover:text-teal-600 transition-colors">Telematics</Link>
          <Link href="/gps-tracking" className="hover:text-teal-600 transition-colors font-medium text-blue-700">GPS Tracking</Link>
          <Link href="/login" className="hover:text-teal-600 transition-colors">Login</Link>
        </div>
      </footer>
    </div>
  );
}
