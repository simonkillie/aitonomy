import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'agentry — Developer Autonomy Leaderboard',
  description: 'Measure how autonomously a developer works, scored from real agent session data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
