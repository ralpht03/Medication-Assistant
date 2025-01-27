import Link from "next/link"
import { Home, Calendar, Info, PlusCircle, HelpCircle } from "lucide-react"

const Sidebar = () => {
  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/" className="flex items-center space-x-2 p-2 rounded-lg bg-gray-900">
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/schedule" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700">
              <Calendar className="h-5 w-5" />
              <span>Medication Schedule</span>
            </Link>
          </li>
          <li>
            <Link href="/info" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700">
              <Info className="h-5 w-5" />
              <span>Medication Information</span>
            </Link>
          </li>
          <li>
            <Link href="/log" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700">
              <PlusCircle className="h-5 w-5" />
              <span>Log Medication</span>
            </Link>
          </li>
          <li>
            <Link href="/help" className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700">
              <HelpCircle className="h-5 w-5" />
              <span>Help/Support</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar

