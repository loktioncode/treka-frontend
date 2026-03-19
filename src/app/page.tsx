'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  Gauge,
  MapPin,
  Fuel,
  Wrench,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Globe,
  Radio,
  Eye,
  DollarSign,
  ChevronRight,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EcuChipVisualization } from '@/components/ui/ecu-chip-visualization';
import { WireframeTruck } from '@/components/ui/wireframe-truck';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const features = [
    {
      icon: Eye,
      title: 'Live Fleet Telematics',
      description: 'See speed, fuel level, engine temperature, and driver behavior for every vehicle — live from the ECU.',
      color: 'teal',
      link: '/fleet-telematics',
    },
    {
      icon: MapPin,
      title: 'GPS Fleet Tracking',
      description: 'Track every vehicle on a live map with real-time location, route trails, geofence alerts, and trip replay.',
      color: 'blue',
      link: '/gps-tracking',
    },
    {
      icon: Shield,
      title: 'Driver Safety Scoring',
      description: 'Harsh braking, speeding, and cornering detected by ECU sensors. Coach drivers and reduce accidents by 40%.',
      color: 'purple',
    },
    {
      icon: Fuel,
      title: 'Fuel Monitoring',
      description: 'Live fuel level from ECU. Detect theft, track consumption per trip, and identify wasteful driving habits.',
      color: 'emerald',
    },
    {
      icon: Wrench,
      title: 'Predictive Maintenance',
      description: 'Engine health, vibration, and voltage monitoring catch problems before they cause expensive roadside breakdowns.',
      color: 'amber',
    },
    {
      icon: BarChart3,
      title: 'Fleet Analytics',
      description: 'Automated trip reports, driver leaderboards, fuel efficiency rankings, and fleet utilization dashboards.',
      color: 'indigo',
    },
  ];

  const benefits = [
    'Save 15-25% on fuel by monitoring driver behavior and consumption',
    'Prevent 80% of breakdowns with live engine health monitoring',
    'Reduce accidents by 40% with harsh event detection and coaching',
    'Eliminate fuel theft with real-time ECU fuel level tracking',
    'Automate trip reports — no more manual driver logbooks',
    'Prove delivery times with GPS-verified arrival data',
    'Track fleet utilization and reduce idle vehicle costs',
    'Get email alerts for speeding, geofence breaches, and breakdowns',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-teal-500/30 font-sans overflow-x-hidden">

      {/* Tech Grid Background */}
      <div className="absolute inset-0 h-[110vh] pointer-events-none tech-grid-bg" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-16 glass-card px-6 py-4 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg shadow-lg shadow-teal-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              TREKAMAN
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/fleet-telematics" className="hidden md:inline text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors">
              Telematics
            </Link>
            <Link href="/gps-tracking" className="hidden md:inline text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors">
              GPS Tracking
            </Link>
            <Link href="/login">
              <Button className="bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_15px_rgba(13,148,136,0.5)] border border-teal-400/50">
                Dashboard Login
              </Button>
            </Link>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-24 grid lg:grid-cols-2 gap-12 items-center"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-teal-500/30 rounded-full text-teal-400 text-sm font-medium mb-8 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
              <Radio className="h-4 w-4 animate-pulse" />
              Live Telematics & GPS Fleet Tracking
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-[1.1]">
              Fleet Management
              <span className="block bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent glow-text mt-2">
                That Saves Money.
              </span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 leading-relaxed font-light">
              Live engine data, GPS tracking, driver scoring, and fuel monitoring — all from one dashboard.
              Know what every vehicle is doing, prevent breakdowns, and <strong className="text-teal-300 font-semibold">cut fleet costs by 25%</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 mb-12">
              <Link href="/login" aria-label="Get started with TREKAMAN">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold px-8 py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all flex items-center gap-2 border border-teal-300/50"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/fleet-telematics">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-7 text-lg rounded-xl flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors bg-slate-900/50 backdrop-blur-sm">
                  <Gauge className="h-5 w-5 text-teal-500" />
                  Explore Telematics
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> 15-25% Fuel Savings
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" /> 80% Fewer Breakdowns
              </div>
            </div>
          </div>

          {/* Hero Visual: ECU Chip & Truck Stack */}
          <div className="relative h-[500px] lg:h-[600px] w-full flex flex-col items-center justify-between py-10">
            {/* Ambient glow behind chip */}
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            {/* ECU Chip at top */}
            <div className="w-full max-w-[320px] z-20 relative transform translate-y-[-20px]">
              <EcuChipVisualization className="w-full h-auto drop-shadow-[0_0_15px_rgba(45,212,191,0.6)]" />
              {/* Vertical data connection from ECU to truck */}
              <div className="absolute top-[90%] left-1/2 -translate-x-1/2 w-[2px] h-[150px] bg-gradient-to-b from-teal-400 to-transparent opacity-30 shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
               <motion.div 
                 initial={{ opacity: 0, y: 0 }}
                 animate={{ opacity: [0, 1, 0], y: [0, 100] }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="absolute top-[90%] left-1/2 -translate-x-1/2 w-[4px] h-[20px] bg-teal-300 rounded-full shadow-[0_0_15px_rgba(94,234,212,1)]"
               />
            </div>

            {/* Faded Wireframe Truck at bottom */}
            <div className="w-full max-w-sm z-10 relative">
              <div className="absolute inset-x-0 bottom-6 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent z-0"></div>
              <WireframeTruck className="w-full h-auto opacity-60" />
            </div>
          </div>
        </motion.main>

        {/* ─── Product Pages CTA ─── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-32"
        >
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Link href="/fleet-telematics" className="group block h-full">
              <div className="h-full glass-card rounded-2xl p-8 hover:bg-slate-800/80 transition-all border-teal-500/20 hover:border-teal-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all" />
                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 w-fit mb-6">
                  <Gauge className="h-8 w-8 text-teal-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-teal-300 transition-colors">
                  Fleet Telematics Data
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Live engine data from every vehicle — speed, fuel, temperature, driver behavior.
                  Prevent breakdowns and cut costs aggressively.
                </p>
                <div className="flex items-center gap-2 text-teal-400 font-semibold group-hover:translate-x-1 transition-transform">
                  Enter Telematics Hub <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>

            <Link href="/gps-tracking" className="group block h-full">
              <div className="h-full glass-card rounded-2xl p-8 hover:bg-slate-800/80 transition-all border-blue-500/20 hover:border-blue-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 w-fit mb-6">
                  <MapPin className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-300 transition-colors">
                  GPS Fleet Tracking
                </h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Track every vehicle on a live map with geofences, trip replay, and real-time alerts.
                  Know where your fleet is, always.
                </p>
                <div className="flex items-center gap-2 text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                  Enter Tracking Hub <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section
          id="features"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-32"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              One Platform. <span className="text-teal-400">Complete Visibility.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">
              Everything fleet managers need to save money, prevent breakdowns, and monitor drivers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {feature.link ? (
                  <Link href={feature.link} className="block h-full">
                    <div className="h-full glass-card border border-slate-800 hover:border-teal-500/40 p-6 rounded-xl transition-all group">
                      <div className={`p-3 rounded-lg mb-4 w-fit bg-${feature.color}-500/10 border border-${feature.color}-500/20 shadow-[0_0_15px_rgba(var(--${feature.color}-500),0.1)]`}>
                        <feature.icon className={`h-6 w-6 text-${feature.color}-400`} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-teal-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-slate-400 leading-relaxed text-sm font-light">
                        {feature.description}
                      </p>
                      <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                        Explore module <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="h-full glass-card border border-slate-800 p-6 rounded-xl transition-all">
                    <div className={`p-3 rounded-lg mb-4 w-fit bg-${feature.color}-500/10 border border-${feature.color}-500/20 shadow-[0_0_15px_rgba(var(--${feature.color}-500),0.1)]`}>
                      <feature.icon className={`h-6 w-6 text-${feature.color}-400`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-sm font-light">
                      {feature.description}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ROI / Benefits Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-32"
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Data-Driven ROI.
              </h2>
              <p className="text-lg text-slate-400 mb-10 font-light">
                Real results from fleet operators across South Africa — not marketing promises, but measurable hard savings powered by ECU data.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={`benefit-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-4"
                  >
                    <div className="mt-1 bg-emerald-500/20 p-1 rounded-full border border-emerald-500/30">
                      <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    </div>
                    <span className="text-slate-300 font-medium">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative space-y-6">
              {/* Decorative background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="animated-pulse-border rounded-2xl p-[1px] bg-gradient-to-br from-teal-500/50 to-emerald-500/20"
              >
                <div className="bg-slate-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden h-full w-full">
                  <div className="absolute -right-10 -top-10 text-teal-500/10">
                    <Activity className="h-48 w-48" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <DollarSign className="h-8 w-8 text-teal-400" />
                      <span className="text-xl font-bold text-white tracking-wide">ROI Snapshot</span>
                    </div>
                    <div className="grid grid-cols-2 gap-8 mb-6">
                      <div>
                        <p className="text-4xl font-black text-white glow-text mb-1">R10K+</p>
                        <p className="text-teal-400 text-sm font-medium">Saved per vehicle / yr</p>
                      </div>
                      <div>
                        <p className="text-4xl font-black text-white glow-text mb-1">3 mo</p>
                        <p className="text-teal-400 text-sm font-medium">Average ROI payback</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 border-t border-slate-800 pt-4">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>Based on 50+ fleet deployments in SA</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="glass-card rounded-2xl p-6 border border-blue-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30">
                    <Zap className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Plug & Play Telematics</p>
                    <p className="text-slate-400 text-sm mt-1">Install device → Add vehicle → Start tracking. Under 5 minutes.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center pb-20"
        >
          <div className="relative rounded-3xl overflow-hidden glass-card border border-teal-500/30 p-[1px]">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/80 to-blue-900/80 -z-10" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAzMG0tMjggMGEyOCAyOCAwIDEgMCA1NiAwYTI4IDI4IDAgMSAwLTU2IDB6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoNDUsMjEyLDE5MSwwLjE1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-40 -z-10" />

            <div className="bg-slate-950/40 backdrop-blur-md p-12 md:p-20 rounded-3xl h-full w-full">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                System Online. <span className="text-teal-400">Ready for Deployment.</span>
              </h2>
              <p className="text-slate-300 mb-10 text-lg max-w-2xl mx-auto font-light">
                Every day without telematics is a day you're overspending on fuel, missing breakdowns, and flying blind.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-7 shadow-[0_0_20px_rgba(20,184,166,0.4)] flex items-center gap-2"
                  >
                    Initialize Connection
                    <Zap className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/fleet-telematics">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-7 flex items-center gap-2"
                  >
                    <Gauge className="h-5 w-5" />
                    Telematics Specs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="border-t border-slate-800 py-10 text-center text-slate-500"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-teal-500" />
            <span className="font-bold text-slate-300 tracking-wider">TREKAMAN</span>
          </div>
          <p className="text-sm font-light">© {new Date().getFullYear()} Phumelela Telematrics. All systems nominal.</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm font-medium">
            <Link href="/" className="text-teal-400 hover:text-teal-300 transition-colors">Uplink (Home)</Link>
            <Link href="/fleet-telematics" className="hover:text-slate-300 transition-colors">Telematics</Link>
            <Link href="/gps-tracking" className="hover:text-slate-300 transition-colors">GPS Tracking</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Login</Link>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}