import PublicNavbar from '@/components/navbar/PublicNavbar';
import Link from 'next/link';
import {
  ShirtIcon, Sparkles, Timer, IndianRupee, Search,
  ArrowRight, CheckCircle, WashingMachine, Wind, Shirt
} from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <PublicNavbar />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-20 px-4 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 text-sky-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Professional Laundry Care
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Professional Laundry Care.
              <br />
              <span className="text-sky-600">Simple Ordering.</span>
              <br />
              Transparent Billing.
            </h1>
            <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Fresh clothes, transparent pricing, and hassle-free tracking.
              Place an order in minutes and track it every step of the way.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/order" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
                Place an Order <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/track" className="btn-secondary text-base px-8 py-3 inline-flex items-center gap-2">
                <Search className="w-4 h-4" /> Track Order
              </Link>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">Quality care for every garment, from everyday clothes to delicate fabrics.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: WashingMachine,
                  title: 'Washing',
                  desc: 'Regular and delicate clothes washed with care. Weight-based pricing with transparent billing.',
                  detail: 'Starting from ₹60/kg',
                },
                {
                  icon: Wind,
                  title: 'Steam Ironing',
                  desc: 'Crisp, wrinkle-free clothes ready to wear. Professional steam press for all garments.',
                  detail: '₹15 per piece',
                },
                {
                  icon: Shirt,
                  title: 'Dry Cleaning',
                  desc: 'Specialized cleaning for suits, jackets, dresses, and delicate fabrics.',
                  detail: 'Starting from ₹80/piece',
                },
              ].map((service, i) => (
                <div key={i} className="card p-7 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mb-5">
                    <service.icon className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{service.desc}</p>
                  <span className="text-sm font-medium text-sky-600">{service.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
              <p className="mt-3 text-gray-500">Simple, transparent, and convenient.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'Place Order', desc: 'Select services, enter details, and submit your order online.' },
                { step: '02', title: 'We Process', desc: 'Our team receives your order and starts processing immediately.' },
                { step: '03', title: 'Track Status', desc: 'Track your order in real-time using your Order ID.' },
                { step: '04', title: 'Pick Up', desc: 'Collect your fresh, clean clothes when they\'re ready.' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Laundry Bros */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Why Laundry Bros</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { icon: IndianRupee, title: 'Transparent Pricing', desc: 'No hidden charges. See your bill breakdown before you pay.' },
                { icon: Timer, title: 'Fast Turnaround', desc: 'Quick processing with real-time status updates on your order.' },
                { icon: CheckCircle, title: 'Quality Guaranteed', desc: 'Professional care for every garment. Satisfaction guaranteed.' },
                { icon: Search, title: 'Easy Tracking', desc: 'Track your order anytime using your Order ID. No account needed.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Order Tracking CTA */}
        <section className="py-16 px-4 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Already placed an order?</h2>
            <p className="text-gray-400 mb-8">Track your order status in real-time. No account needed.</p>
            <Link href="/track" className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
              <Search className="w-4 h-4" /> Track Your Order
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-4 bg-gray-950 text-gray-400">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShirtIcon className="w-5 h-5 text-sky-500" />
              <span className="text-white font-semibold">Laundry Bros</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} Laundry Bros. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/order" className="hover:text-white transition-colors">Place Order</Link>
              <Link href="/track" className="hover:text-white transition-colors">Track Order</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
