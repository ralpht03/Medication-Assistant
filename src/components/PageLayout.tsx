"use client"

import { ReactNode } from 'react'
import Header from './Header'
import AdminHeader from './AdminHeader'
import HelperHeader from './HelperHeader'
import Sidebar from './Sidebar'
import AdminSidebar from './AdminSidebar'
import HelperSidebar from './HelperSidebar'

interface PageLayoutProps {
  children: ReactNode
  userType: 'patient' | 'admin' | 'helper'
  title?: string
}

/**
 * A consistent layout component to be used across all pages
 * This ensures the sidebar and header are positioned consistently
 */
export default function PageLayout({ children, userType, title }: PageLayoutProps) {
  const HeaderComponent = userType === 'admin' 
    ? AdminHeader 
    : userType === 'helper'
    ? HelperHeader
    : Header
  const SidebarComponent = userType === 'admin' 
    ? AdminSidebar 
    : userType === 'helper'
    ? HelperSidebar
    : Sidebar

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-30">
        <HeaderComponent />
      </div>
      
      {/* Fixed Sidebar - White Background */}
      <div className="fixed left-0 top-0 bottom-0 w-64 z-20 bg-white shadow-md">
        {/* Spacer to push content below header */}
        <div className="h-16 bg-white"></div>
        {/* Sidebar content */}
        <div className="h-[calc(100vh-4rem)] bg-white overflow-y-auto">
          <SidebarComponent />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="ml-64 pt-16 w-[calc(100vw-16rem)]">
        <main className="p-6 bg-gray-100 min-h-[calc(100vh-4rem)] w-full">
          {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  )
}