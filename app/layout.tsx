import type { Metadata } from "next"
import { Barlow } from "next/font/google"
import "./globals.css"

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
})

export const metadata: Metadata = {
  title: "BIZPOS - 비플식권 결제 연동 웹 POS",
  description: "비플페이 PG API v1.7 연동 웹 POS",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${barlow.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
