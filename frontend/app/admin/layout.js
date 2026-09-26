'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/navbar/DashboardSidebar';
import { ShirtIcon } from 'lucide-react';

export default function AdminLayout({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin && mounted) {
      router.push('/login');
    }
  }, [loading, isAdmin, router, mounted]);

  if (!mounted || loading) {
    return <div className="min-h-screen flex justify-center items-center"><div className="animate-pulse flex items-center gap-2"><ShirtIcon className="w-6 h-6 text-sky-600 animate-spin-slow" /> Loading Admin...</div></div>;
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <DashboardSidebar variant="admin" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
