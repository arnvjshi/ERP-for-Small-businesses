'use client';

import Link from 'next/link';
import { ShirtIcon, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="glass-navbar fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <ShirtIcon className="w-7 h-7 text-sky-600" strokeWidth={1.8} />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Laundry Bros
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="btn-ghost text-sm">Home</Link>
            <Link href="/order" className="btn-ghost text-sm">Place Order</Link>
            <Link href="/track" className="btn-ghost text-sm">Track Order</Link>
            <Link href="/order" className="btn-primary text-sm ml-2">
              Place an Order
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link href="/" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link href="/order" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>Place Order</Link>
            <Link href="/track" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileOpen(false)}>Track Order</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
