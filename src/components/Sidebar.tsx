import Link from "next/link"
import { Home, Calendar, Bell, Info, HelpCircle } from "lucide-react"

const Sidebar = () => {
  return (
    <aside className="fixed h-[calc(100vh-4rem)] w-64 bg-white shadow-md overflow-y-auto">
      <nav className="p-4">
        <div className="space-y-1">
          {/* Dashboard - Primary navigation */}
          <Link
            href="/patient/dashboard"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <Home className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Dashboard</span>
          </Link>

          {/* Schedule with History - Prominent placement */}
          <Link
            href="/patient/schedule"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <Calendar className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">
              Schedule & History
            </span>
          </Link>

          {/* Medications */}
          <Link
            href="/patient/medications"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <Info className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Medications</span>
          </Link>

          {/* Notifications */}
          <Link
            href="/patient/notifications"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <Bell className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Notifications</span>
          </Link>

          {/* Help & Support */}
          <Link
            href="/patient/help"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <HelpCircle className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Help & Support</span>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Links
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            <Link
              href="/patient/settings"
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Settings
            </Link>
            <Link
              href="/patient/profile"
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Profile
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
