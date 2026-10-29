import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReturnDesk — Returns operations',
  description: 'A thoughtful returns desk for small online stores.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
