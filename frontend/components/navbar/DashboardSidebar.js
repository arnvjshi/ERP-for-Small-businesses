'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  ShirtIcon, LayoutDashboard, ClipboardList, Tags, Package, FileText,
  Users, LogOut, Settings, ChevronLeft, Menu
} from 'lucide-react';
import { useState } from 'react';

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/pricing', label: 'Services & Pricing', icon: Tags },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/workers', label: 'Workers', icon: Users },
  { href: '/admin/audit', label: 'Audit Logs', icon: FileText },
];

const workerLinks = [
  { href: '/worker', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/worker/orders', label: 'Orders', icon: ClipboardList },
];

export default function DashboardSidebar({ variant = 'admin' }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const links = variant === 'admin' ? adminLinks : workerLinks;

  return (
    <aside className={`bg-white border-r border-gray-100 flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <ShirtIcon className="w-6 h-6 text-sky-600" strokeWidth={1.8} />
            <span className="text-base font-bold text-gray-900">Laundry Bros</span>
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-gray-100">
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {links.map(link => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== '/admin' && link.href !== '/worker' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? link.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-gray-100">
        {!collapsed && (
          <div className="mb-2 px-2">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</div>
            <div className="text-xs text-gray-500">{user?.role}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
