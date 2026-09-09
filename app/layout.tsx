import type { Metadata } from 'next';
import './globals.css';
import { Assistant } from '@/app/components/Assistant';
import { ToastProvider } from '@/app/components/Toast';
import { AppShell } from '@/app/components/AppShell';

export const metadata: Metadata = {
  title: 'NOVA — Newcomer Onboarding & Virtual Assistant',
  description: "NOVA is a bright guide for every new employee's journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
          <Assistant />
        </ToastProvider>
      </body>
    </html>
  );
}


