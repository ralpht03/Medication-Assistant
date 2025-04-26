"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Bell, Mail, LogOut, Settings } from 'lucide-react'

const HelperSidebar = () => {
  const pathname = usePathname()

  return (
    <div className="h-full">
      <nav className="p-4">
        <div className="space-y-1">
          <Link
            href="/helper/dashboard"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/helper/dashboard' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Home className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Dashboard</span>
          </Link>

          <Link
            href="/helper/patients"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/helper/patients' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Users className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Patients</span>
          </Link>

          <Link
            href="/helper/alerts"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/helper/alerts' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Bell className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Alerts</span>
          </Link>

          <Link
            href="/helper/invitations"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/helper/invitations' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Mail className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Invitations</span>
          </Link>

          <Link
            href="/helper/settings"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/helper/settings' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Settings className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Settings</span>
          </Link>
        </div>
      </nav>

      <div className="p-4 mt-auto border-t border-gray-200">
        <button
          onClick={() => {
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group w-full"
        >
          <LogOut className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
          <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Logout</span>
        </button>
      </div>
    </div>
  )
}

export default HelperSidebar 