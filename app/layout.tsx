import type { Metadata } from 'next';
import { Courier_Prime } from 'next/font/google';
import './globals.css';

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-courier-prime',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OMNI LOCO AI — Multimodal On-Device Intelligence Lab',
  description:
    'Production-grade, fully client-side multimodal machine learning suite in Next.js. WebGPU/WASM on-device inference with zero cloud data transmission.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={courierPrime.variable}>
      <body className="min-h-screen bg-paper-cream text-charcoal-soft font-mono antialiased selection:bg-charcoal-soft selection:text-paper-cream">
        {children}
      </body>
    </html>
  );
}
