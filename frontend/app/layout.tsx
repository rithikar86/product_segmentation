import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ToastProvider } from "@/components/toast-provider"
import { CustomersProvider } from "@/components/customer-context"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Customer Segments and Products for Retail using RFM",
  description: "Real-time Retail Analytics & Smart Product Recommendation System",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
  ],
}

import { AuthProvider } from "@/components/auth-context"
import { LayoutContent } from "@/components/layout-content"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <ToastProvider>
              <CustomersProvider>
                <LayoutContent>{children}</LayoutContent>
              </CustomersProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
