"use client"

import { ReactNode } from 'react'
import Header from './Header'
import AdminHeader from './AdminHeader'
import Sidebar from './Sidebar'
import AdminSidebar from './AdminSidebar'

interface PageLayoutProps {
  children: ReactNode
  userType: 'patient' | 'admin'
  title?: string
}

/**
 * A consistent layout component to be used across all pages
 * This ensures the sidebar and header are positioned consistently
 */
export default function PageLayout({ children, userType, title }: PageLayoutProps) {
  const HeaderComponent = userType === 'admin' ? AdminHeader : Header
  const SidebarComponent = userType === 'admin' ? AdminSidebar : Sidebar

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-20">
        <HeaderComponent />
      </div>
      
      {/* Fixed Sidebar - White Background */}
      <div className="fixed left-0 top-0 bottom-0 w-64 z-10 bg-white shadow-md">
        {/* Spacer to push content below header */}
        <div className="h-16 bg-white"></div>
        {/* Sidebar content */}
        <div className="h-[calc(100vh-4rem)] bg-white overflow-y-auto">
          <SidebarComponent />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="ml-64 pt-16">
        <main className="p-6 bg-gray-100 min-h-[calc(100vh-4rem)]">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  )
}