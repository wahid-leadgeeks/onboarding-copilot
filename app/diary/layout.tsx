import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Diary' };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
