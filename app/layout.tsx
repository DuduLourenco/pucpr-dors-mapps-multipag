import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Toast } from './_componentes/Toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--fonte-sans' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--fonte-mono' });

export const metadata: Metadata = {
  title: 'MultiPag',
  description: 'Cobranças multicanais: Pix, cartão, boleto e cripto em um só link.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F8FAFC',
};

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>
        <main>{children}</main>
        <Toast />
      </body>
    </html>
  );
}
