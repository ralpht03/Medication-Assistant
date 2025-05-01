import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  PillIcon,
  Bell,
  BarChart,
  Settings,
  AlertCircle,
  CheckSquare,
  Mail,
  LogOut
} from "lucide-react"

const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <div className="h-full">
      <nav className="p-4">
        <div className="space-y-1">
          {/* Dashboard - Primary navigation */}
          <Link
            href="/admin/dashboard"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/admin/dashboard' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <BarChart className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Dashboard</span>
          </Link>

          {/* Patient Management */}
          <Link
            href="/admin/patients"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/admin/patients' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Users className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">
              Patients
            </span>
          </Link>

          {/* Invitations */}
          <Link
            href="/admin/invitations"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/admin/invitations' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <Mail className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">
              Invitations
            </span>
          </Link>

          {/* Medication Management */}
          <Link
            href="/admin/medications"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/admin/medications' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <PillIcon className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Medications</span>
          </Link>

          {/* Verifications */}
          <Link
            href="/admin/verifications"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/admin/verifications' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <CheckSquare className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Verifications</span>
          </Link>

          {/* Alerts & Notifications */}
          <Link
            href="/admin/alerts"
            className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
              pathname === '/admin/alerts' ? 'bg-blue-100 text-blue-700' : ''
            }`}
          >
            <AlertCircle className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
            <span className="ml-3 text-sm font-medium group-hover:text-blue-600">Alerts</span>
          </Link>
        </div>
      </nav>

      <div className="p-4 mt-8 border-t border-gray-200">
        <div className="px-4 py-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Admin Settings
          </h3>
        </div>
        <div className="mt-2 space-y-1">
          <Link
            href="/admin/settings"
            className={`flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg ${
              pathname === '/admin/settings' ? 'bg-blue-50 text-blue-600' : ''
            }`}
          >
            <Settings className="h-4 w-4 text-gray-500 mr-3" />
            Settings
          </Link>
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg w-full"
          >
            <LogOut className="h-4 w-4 text-gray-500 mr-3" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminSidebar