"use client";

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // ไม่แสดง navbar/footer ในหน้า login และ register
  const hideNavbar = pathname === '/login' || pathname === '/register';

  if (hideNavbar || !session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black flex flex-col">
      <Navbar session={session} />
      
      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}