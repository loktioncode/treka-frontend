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
      color: "red",
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
      stat: "3+ hours",
      statLabel: "daily lost to fleet coordination",
      color: "gray",
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
    },
    {
      icon: Fuel,
      title: "Fuel Level & Consumption Tracking",
      description:
        "Live fuel level from the CAN bus, not estimates. Detect fuel theft instantly. Track consumption per trip and identify your most and least efficient vehicles.",
      benefit: "Save 15-25% on fuel costs",
      gradient: "from-emerald-500 to-green-500",
    },
    {
      icon: Thermometer,
      title: "Predictive Engine Health",
      description:
        "Coolant temperature, oil temperature, intake air, and battery voltage monitored continuously. Get warned before the engine overheats or the battery dies.",
      benefit: "Prevent 80% of roadside breakdowns",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      icon: Activity,
      title: "Driver Behavior Scoring",
      description:
        "Every harsh brake, aggressive acceleration, and hard corner is detected by our IMU sensors. Drivers get scored, and you get a leaderboard to coach them.",
      benefit: "Reduce accidents by 40%",
      gradient: "from-purple-500 to-violet-500",
    },
    {
      icon: Wrench,
      title: "Maintenance Intelligence",
      description:
        "Engine load patterns, vibration data, and component health metrics tell you which vehicles need service — before they break down and cost you 10x more.",
      benefit: "Cut maintenance costs by 30%",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: BarChart3,
      title: "Fleet Analytics & Reports",
      description:
        "Automated trip reports with distance, fuel used, driver score, and route compliance. Export to PDF or view in-app. No more manual log books.",
      benefit: "Save 5+ hours per week on admin",
      gradient: "from-rose-500 to-pink-500",
    },
  ];

  const ecuDataPoints = [
    { name: "Vehicle Speed", source: "CAN Bus / GPS", icon: Gauge },
    { name: "Engine RPM", source: "OBD-II PID", icon: Activity },
    { name: "Fuel Level", source: "CAN Bus", icon: Fuel },
    { name: "Coolant Temperature", source: "OBD-II PID", icon: Thermometer },
    { name: "Battery Voltage", source: "CAN Bus", icon: Zap },
    { name: "Engine Load", source: "OBD-II PID", icon: Target },
    { name: "Throttle Position", source: "OBD-II PID", icon: Gauge },
    { name: "Mass Air Flow", source: "OBD-II PID", icon: Activity },
    { name: "Oil Temperature", source: "CAN Bus", icon: Thermometer },
    { name: "Intake Air Temp", source: "OBD-II PID", icon: Thermometer },
    { name: "Fuel Pressure", source: "CAN Bus", icon: Fuel },
    { name: "Barometric Pressure", source: "OBD-II PID", icon: Activity },
    { name: "Harsh Braking", source: "IMU Sensor", icon: AlertTriangle },
    { name: "Hard Cornering", source: "IMU Sensor", icon: AlertTriangle },
    { name: "Vibration / Road Quality", source: "IMU Sensor", icon: Activity },
    { name: "Roll & Pitch Angle", source: "IMU Sensor", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
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
          <Link href="/gps-tracking" className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
            GPS Tracking
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-100 rounded-full text-teal-700 text-sm font-medium mb-6">
            <Radio className="h-4 w-4" />
            Live Vehicle Data from Teltonika, OBD-II & Custom IoT Devices
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Know What Every Vehicle
            <span className="block bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Is Doing Right Now
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            TREKAMAN reads live data straight from your vehicle&apos;s engine computer — speed, fuel, temperature,
            driver behaviour — and turns it into <strong>money-saving, breakdown-preventing</strong> insights
            for fleet managers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Get Started — It&apos;s Free to Try
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl">
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { number: "15-25%", label: "Fuel Savings" },
              { number: "80%", label: "Fewer Breakdowns" },
              { number: "40%", label: "Accident Reduction" },
              { number: "< 5 min", label: "Device Setup" },
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

      {/* ─── The Problem ─── */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fleet Managers Lose Money Every Day <span className="text-red-400">Without Telematics</span>
            </h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              If you can&apos;t see what&apos;s happening inside your vehicles, you&apos;re flying blind
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {problems.map((problem, i) => (
              <motion.div
                key={problem.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card className="bg-slate-800/80 border-slate-700 h-full hover:border-slate-600 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-${problem.color}-500/20 flex-shrink-0`}>
                        <problem.icon className={`h-6 w-6 text-${problem.color}-400`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">{problem.title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-3">{problem.description}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-bold text-${problem.color}-400`}>{problem.stat}</span>
                          <span className="text-xs text-slate-400">{problem.statLabel}</span>
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

      {/* ─── The Solution ─── */}
      <section id="how-it-works" className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How TREKAMAN <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Solves This</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            A plug-and-play device in each vehicle sends live engine data to your dashboard — no mechanic needed
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {solutions.map((sol, i) => (
            <motion.div
              key={sol.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
                <CardContent className="p-0">
                  <div className={`h-2 bg-gradient-to-r ${sol.gradient}`} />
                  <div className="p-6">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${sol.gradient} w-fit mb-4 shadow-md`}>
                      <sol.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">
                      {sol.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{sol.description}</p>
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-emerald-700">{sol.benefit}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Data Points Grid ─── */}
      <section className="bg-gradient-to-br from-slate-50 to-teal-50/40 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              16+ Data Points From Every Vehicle
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We read data directly from the vehicle&apos;s ECU via OBD-II, CAN bus, and onboard IMU sensors
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {ecuDataPoints.map((dp, i) => (
              <motion.div
                key={dp.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all text-center group"
              >
                <dp.icon className="h-5 w-5 text-teal-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-gray-800">{dp.name}</p>
                <p className="text-[10px] text-gray-400 uppercase font-medium mt-1">{dp.source}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Compatible Devices ─── */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Works With Your Existing Hardware
            </h2>
            <p className="text-gray-600 text-lg">
              Plug in a Teltonika device or our custom ESP32 OBD-II reader — data flows in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Teltonika FMB/FMC",
                desc: "Industry-standard GPS + CAN bus trackers. Already have them? We integrate via Flespi MQTT in one click.",
                badge: "Most Popular",
                badgeColor: "bg-teal-100 text-teal-700",
              },
              {
                title: "Custom OBD-II (ESP32)",
                desc: "Our open-source firmware reads 12+ OBD-II PIDs + 6-axis IMU at 10 Hz. Under R500 per device.",
                badge: "Best Value",
                badgeColor: "bg-amber-100 text-amber-700",
              },
              {
                title: "Any MQTT Device",
                desc: "Any GPS/telematics device that speaks MQTT can integrate. We support custom topics and payloads.",
                badge: "Flexible",
                badgeColor: "bg-purple-100 text-purple-700",
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
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${device.badgeColor}`}>
                      {device.badge}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{device.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{device.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-teal-600 to-emerald-600 overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMG0tMjggMGEyOCAyOCAwIDEgMCA1NiAwYTI4IDI4IDAgMSAwLTU2IDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-30" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Stop Losing Money on Fuel, Breakdowns & Unsafe Driving
                </h2>
                <p className="text-teal-100 mb-8 text-lg max-w-2xl mx-auto">
                  Join fleet managers across South Africa who are already saving R10,000+ per vehicle per year with TREKAMAN telematics.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="bg-white text-teal-700 hover:bg-teal-50 font-bold px-8 py-6 text-lg rounded-xl shadow-lg"
                    >
                      Start Your Free Trial
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/gps-tracking">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                    >
                      Learn About GPS Tracking
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
          <Link href="/fleet-telematics" className="hover:text-teal-600 transition-colors font-medium text-teal-700">Telematics</Link>
          <Link href="/gps-tracking" className="hover:text-teal-600 transition-colors">GPS Tracking</Link>
          <Link href="/login" className="hover:text-teal-600 transition-colors">Login</Link>
        </div>
      </footer>
    </div>
  );
}
