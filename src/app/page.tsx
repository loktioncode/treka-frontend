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
  Car,
  Activity,
  Radio,
  Eye,
  DollarSign,
  Thermometer,
  AlertTriangle,
  Target,
  Route,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MarketingCarousel } from '@/components/ui/marketing-carousel';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
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
      description: 'Harsh braking, speeding, and cornering detected by IMU sensors. Coach drivers and reduce accidents by 40%.',
      color: 'purple',
    },
    {
      icon: Fuel,
      title: 'Fuel Monitoring',
      description: 'Live fuel level from CAN bus. Detect theft, track consumption per trip, and identify wasteful driving habits.',
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
    'Eliminate fuel theft with real-time CAN bus fuel level tracking',
    'Automate trip reports — no more manual driver logbooks',
    'Prove delivery times with GPS-verified arrival data',
    'Track fleet utilization and reduce idle vehicle costs',
    'Get WhatsApp/email alerts for speeding, geofence breaches, and breakdowns',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-16"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              TREKAMAN
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/fleet-telematics" className="hidden md:inline text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
              Telematics
            </Link>
            <Link href="/gps-tracking" className="hidden md:inline text-sm font-medium text-gray-600 hover:text-teal-700 transition-colors">
              GPS Tracking
            </Link>
            <Link href="/login">
              <Button>
                Login to Dashboard
              </Button>
            </Link>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-20"
        >
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-100 rounded-full text-teal-700 text-sm font-medium mb-6">
              <Radio className="h-4 w-4" />
              Live Telematics & GPS Tracking for Fleets
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Fleet Management
              <span className="block bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                That Saves You Money
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Live engine data, GPS tracking, driver scoring, and fuel monitoring — all from one dashboard. 
              Know what every vehicle is doing, prevent breakdowns, and <strong>cut fleet costs by 25%</strong>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/login" aria-label="Get started with TREKAMAN - Sign up or login to your account">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  aria-label="Get started with TREKAMAN"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/fleet-telematics">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  See Telematics Features
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { number: '15-25%', label: 'Fuel Savings' },
                { number: '80%', label: 'Fewer Breakdowns' },
                { number: '<5 min', label: 'Device Setup' },
                { number: '24/7', label: 'Live Monitoring' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  custom={index}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.main>

        {/* ─── Product Pages CTA ─── */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link href="/fleet-telematics" className="group">
              <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-teal-600 to-emerald-600 text-white">
                <CardContent className="p-8">
                  <div className="p-3 rounded-xl bg-white/20 w-fit mb-4">
                    <Gauge className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:translate-x-1 transition-transform">
                    Fleet Telematics
                  </h3>
                  <p className="text-teal-100 mb-4 leading-relaxed">
                    Live engine data from every vehicle — speed, fuel, temperature, driver behavior. 
                    Prevent breakdowns and cut costs.
                  </p>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    Learn More <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/gps-tracking" className="group">
              <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                <CardContent className="p-8">
                  <div className="p-3 rounded-xl bg-white/20 w-fit mb-4">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 group-hover:translate-x-1 transition-transform">
                    GPS Fleet Tracking
                  </h3>
                  <p className="text-blue-100 mb-4 leading-relaxed">
                    Track every vehicle on a live map with geofences, trip replay, and real-time alerts.
                    Know where your fleet is, always.
                  </p>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    Learn More <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.section>

        {/* Features Section */}
        <motion.section 
          id="features"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              One Platform. Complete Fleet Visibility.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything fleet managers need to save money, prevent breakdowns, and keep drivers safe
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                      <CardContent className="p-6">
                        <div className={`p-3 rounded-lg mb-4 w-fit bg-${feature.color}-100`}>
                          <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-sm">
                          {feature.description}
                        </p>
                        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-600">
                          Learn more <ChevronRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6">
                      <div className={`p-3 rounded-lg mb-4 w-fit bg-${feature.color}-100`}>
                        <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed text-sm">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Benefits Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Fleet Managers Choose TREKAMAN
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Real results from real fleet operators across South Africa — not marketing promises, but measurable savings.
              </p>
              
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={`benefit-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-8 text-white shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-8 w-8" />
                  <span className="text-xl font-semibold">ROI Snapshot</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-3xl font-bold">R10K+</p>
                    <p className="text-teal-200 text-sm">Saved per vehicle / year</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">3 months</p>
                    <p className="text-teal-200 text-sm">Average payback period</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-teal-200">
                  <Star className="h-4 w-4 fill-current" />
                  <span>Based on 50+ fleet deployments in South Africa</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6" />
                  <div>
                    <p className="font-semibold">Plug & Play Setup</p>
                    <p className="text-blue-200 text-sm">Install device → Add vehicle → Start tracking. Under 5 minutes.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Marketing Carousel */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <MarketingCarousel />
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-teal-600 to-emerald-600">
            <CardContent className="p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Stop Losing Money. Start Tracking Your Fleet.
              </h2>
              <p className="text-teal-100 mb-8 text-lg max-w-2xl mx-auto">
                Every day without telematics is a day you're overspending on fuel, missing breakdowns, and risking driver safety.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button 
                    size="lg" 
                    className="bg-white text-teal-600 hover:bg-gray-50 font-semibold flex items-center gap-2"
                  >
                    Access Your Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/fleet-telematics">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Gauge className="h-4 w-4" />
                    Telematics Details
                  </Button>
                </Link>
                <Link href="/gps-tracking">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    GPS Tracking Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 pt-8 border-t border-gray-200 text-center text-gray-500"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-4 w-4" />
            <span className="font-semibold">TREKAMAN</span>
          </div>
          <p>© {new Date().getFullYear()} TREKAMAN Fleet Management System. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <Link href="/" className="hover:text-teal-600 transition-colors font-medium text-teal-700">Home</Link>
            <Link href="/fleet-telematics" className="hover:text-teal-600 transition-colors">Telematics</Link>
            <Link href="/gps-tracking" className="hover:text-teal-600 transition-colors">GPS Tracking</Link>
            <Link href="/login" className="hover:text-teal-600 transition-colors">Login</Link>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}