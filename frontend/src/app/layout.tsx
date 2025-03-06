import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Baserow ERD Viewer',
  description: 'Visualize Baserow tables as Entity-Relationship Diagrams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
} 