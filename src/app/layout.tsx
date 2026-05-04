import type { Metadata } from 'next'
import { SupabaseAuthProvider } from './context/SupabaseAuthContext'
import { RecyclingDataProvider } from './context/RecyclingDataContext'
import { ConfirmationProvider } from './context/ConfirmationContext'
import { NotificationProvider } from './context/NotificationContext'
import { SidebarProvider } from './context/SidebarContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'EcoWaste Recycling',
  description: 'Recycling Management System',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full antialiased">
        <SupabaseAuthProvider>
          <NotificationProvider>
            <ConfirmationProvider>
              <RecyclingDataProvider>
                <SidebarProvider>
                  {children}
                </SidebarProvider>
              </RecyclingDataProvider>
            </ConfirmationProvider>
          </NotificationProvider>
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}