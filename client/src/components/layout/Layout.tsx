import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Toaster } from 'sonner';

export function Layout() {
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const shiftedContentClass = isNotificationDrawerOpen
    ? 'lg:pr-[clamp(320px,25vw,420px)]'
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        isNotificationDrawerOpen={isNotificationDrawerOpen}
        onNotificationDrawerOpenChange={setIsNotificationDrawerOpen}
      />
      <div className={`flex flex-1 flex-col transition-[padding-right] duration-300 ${shiftedContentClass}`}>
        <main className="flex-1 pt-20">
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#2d333b',
            border: '1px solid rgba(92, 98, 105, 0.3)',
            color: '#e7eaed',
          },
        }}
      />
    </div>
  );
}
