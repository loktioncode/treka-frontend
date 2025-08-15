'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Package, 
  BarChart3, 
  Wrench, 
  Users, 
  Building2, 
  CheckCircle, 
  ArrowRight,
  Star,
  Zap,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const features = [
    {
      icon: Package,
      title: 'Asset Tracking',
      description: 'Comprehensive asset management with real-time monitoring, location tracking, and detailed analytics.',
      color: 'blue'
    },
    {
      icon: Wrench,
      title: 'Maintenance Management',
      description: 'Automated scheduling, preventive maintenance alerts, and complete maintenance history tracking.',
      color: 'green'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Powerful reporting tools with customizable dashboards and performance insights.',
      color: 'purple'
    },
    {
      icon: Users,
      title: 'Multi-User Support',
      description: 'Role-based access control with client isolation and secure user management.',
      color: 'indigo'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade security with encrypted data transmission and secure authentication.',
      color: 'red'
    },
    {
      icon: Globe,
      title: 'Cloud-Based',
      description: 'Access your data anywhere, anytime with our reliable cloud infrastructure.',
      color: 'teal'
    }
  ];

  const benefits = [
    'Reduce downtime by up to 40% with predictive maintenance',
    'Improve asset utilization and ROI tracking',
    'Streamline compliance and audit processes',
    'Centralize all asset information in one platform',
    'Mobile-friendly interface for field teams',
    'Automated notifications and alerts'
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
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              TREKA
            </div>
          </div>
          <Button asChild>
            <Link href="/login">
              Login to Dashboard
            </Link>
          </Button>
        </motion.nav>

        {/* Hero Section */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-20"
        >
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
              Asset Management
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Redefined
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Streamline your asset lifecycle management with our comprehensive platform. 
              From acquisition to disposal, track every component with precision and insight.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Link href="/login" className="flex items-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">
                  Learn More
                </Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { number: '500+', label: 'Assets Managed' },
                { number: '50+', label: 'Organizations' },
                { number: '99.9%', label: 'Uptime' },
                { number: '24/7', label: 'Support' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.main>

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
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A complete suite of tools designed to streamline your asset management workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className={`p-3 rounded-lg mb-4 w-fit bg-${feature.color}-100`}>
                      <feature.icon className={`h-6 w-6 text-${feature.color}-600`} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
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
                Why Choose TREKA?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Transform your asset management process with our proven platform trusted by organizations worldwide.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="h-8 w-8" />
                  <span className="text-xl font-semibold">Quick Start</span>
                </div>
                <p className="text-blue-100 mb-6">
                  Get up and running in minutes with our intuitive interface and comprehensive onboarding process.
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-200">
                  <Star className="h-4 w-4 fill-current" />
                  <span>Rated 4.9/5 by our users</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600">
            <CardContent className="p-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Operations?
              </h2>
              <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
                Join thousands of organizations already using TREKA to optimize their asset management processes.
              </p>
              <Button 
                size="lg" 
                asChild 
                className="bg-white text-blue-600 hover:bg-gray-50 font-semibold"
              >
                <Link href="/login" className="flex items-center gap-2">
                  Access Your Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
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
            <span className="font-semibold">TREKA</span>
          </div>
          <p>© {new Date().getFullYear()} TREKA Asset Management System. All rights reserved.</p>
        </motion.footer>
      </div>
    </div>
  );
}