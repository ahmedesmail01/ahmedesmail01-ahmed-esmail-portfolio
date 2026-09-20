import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'Ahmed Esmail — Full-Stack & Frontend Engineer',template:'%s | Ahmed Esmail'},description:'Thoughtful interfaces. Reliable engineering. Ahmed Esmail builds websites, commerce experiences, learning platforms and enterprise applications.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preload" href="/landing-pages/inner-green-assets/lexend-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
