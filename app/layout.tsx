import type { Metadata } from 'next';
import './globals.css';
import { Assistant } from '@/app/components/Assistant';

export const metadata: Metadata = { title: 'Onboarding Copilot', description: 'Your calm onboarding cockpit' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Assistant />
      </body>
    </html>
  );
}
