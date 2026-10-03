import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'First month review' };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
