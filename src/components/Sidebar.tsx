"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  PlusCircleIcon, 
  CalendarIcon, 
  SettingsIcon, 
  LogOutIcon,
  PillIcon,
  BellIcon
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role || 'patient';

  const menuItems = {
    patient: [
      { name: 'Dashboard', href: '/patient/dashboard', icon: HomeIcon },
      { name: 'Medications', href: '/patient/medications', icon: PillIcon },
      { name: 'Schedule', href: '/patient/schedule', icon: CalendarIcon },
      { name: 'Notifications', href: '/patient/notifications', icon: BellIcon },
      { name: 'Settings', href: '/patient/settings', icon: SettingsIcon },
    ],
    helper: [
      { name: 'Dashboard', href: '/helper/dashboard', icon: HomeIcon },
      { name: 'Patients', href: '/helper/patients', icon: PlusCircleIcon },
      { name: 'Settings', href: '/helper/settings', icon: SettingsIcon },
    ],
    admin: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
      { name: 'Users', href: '/admin/users', icon: PlusCircleIcon },
      { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
    ],
  };

  const currentMenuItems = menuItems[role as keyof typeof menuItems] || menuItems.patient;

  return (
    <div className="w-64 min-h-screen bg-white shadow-lg fixed left-0 top-0 z-10">
      <div className="flex flex-col h-full">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-800">MedTracker</h2>
        </div>
        
        <nav className="flex-1 px-2 py-4">
          {currentMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 mt-2 text-gray-600 rounded-lg hover:bg-gray-100 ${
                  isActive ? 'bg-blue-100 text-blue-700' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="mx-4">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="flex items-center px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 w-full"
          >
            <LogOutIcon className="w-5 h-5" />
            <span className="mx-4">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
