import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'agentry',
  description: 'Measure how autonomously a developer works, scored from real agent session data — not self-reported.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
