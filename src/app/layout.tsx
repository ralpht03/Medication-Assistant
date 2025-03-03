import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MediTrack - Your Medication Management App",
  description: "Easily manage your medications and track your adherence",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script async src="https://docs.opencv.org/master/opencv.js"></script>
      </head>
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-100">{children}</div>
      </body>
    </html>
  )
}

