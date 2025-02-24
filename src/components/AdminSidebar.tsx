import Link from "next/link"
import { 
  Users, 
  PillIcon, 
  Bell, 
  BarChart, 
  Settings, 
  AlertCircle,
  CheckSquare 
} from "lucide-react"

const AdminSidebar = () => {
  return (
    <aside className="fixed h-[calc(100vh-4rem)] w-64 bg-white shadow-md overflow-y-auto">
      <nav className="p-4">
        <div className="space-y-1">
          {/* Dashboard - Primary navigation */}
          <Link
            href="/admin/dashboard"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <BarChart className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Dashboard</span>
          </Link>

          {/* Patient Management */}
          <Link
            href="/admin/patients"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <Users className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">
              Patients
            </span>
          </Link>

          {/* Medication Management */}
          <Link
            href="/admin/medications"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <PillIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Medications</span>
          </Link>

          {/* Verifications */}
          <Link
            href="/admin/verifications"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <CheckSquare className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Verifications</span>
          </Link>

          {/* Alerts & Notifications */}
          <Link
            href="/admin/alerts"
            className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <AlertCircle className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Alerts</span>
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admin Settings
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            <Link
              href="/admin/settings"
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="h-4 w-4 text-gray-500 mr-3" />
              Settings
            </Link>
            <Link
              href="/admin/notifications"
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="h-4 w-4 text-gray-500 mr-3" />
              Notification Settings
            </Link>
          </div>
        </div>
      </nav>
    </aside>
  )
}

export default AdminSidebar