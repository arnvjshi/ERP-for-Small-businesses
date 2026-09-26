'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/navbar/DashboardSidebar';
import { ShirtIcon } from 'lucide-react';

export default function WorkerLayout({ children }) {
  const { user, loading, isWorker } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !isWorker && mounted) {
      router.push('/login');
    }
  }, [loading, isWorker, router, mounted]);

  if (!mounted || loading) {
    return <div className="min-h-screen flex justify-center items-center"><div className="animate-pulse flex items-center gap-2"><ShirtIcon className="w-6 h-6 text-sky-600 animate-spin-slow" /> Loading...</div></div>;
  }

  if (!isWorker) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <DashboardSidebar variant="worker" />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
