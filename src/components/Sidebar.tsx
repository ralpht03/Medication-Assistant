"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  PlusCircle,
  Calendar,
  Settings,
  LogOut,
  Info,
  Bell,
  HelpCircle,
  Bot,
  Mail,
  Camera,
  AlertTriangle
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('patient');

  useEffect(() => {
    // Access localStorage after component mounts
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setRole(userData?.role || 'patient');
    }
  }, []);

  const menuItems = {
    patient: [
      { name: 'Dashboard', href: '/patient/dashboard', icon: Home },
      { name: 'Medications', href: '/patient/medications', icon: Info },
      { name: 'Schedule', href: '/patient/schedule', icon: Calendar },
      { name: 'Pill Identification', href: '/patient/camera', icon: Camera },
      { name: 'Alerts', href: '/patient/alerts', icon: AlertTriangle },
      { name: 'AI Assistant', href: '/patient/ai-assistant', icon: Bot },
      { name: 'Notifications', href: '/patient/notifications', icon: Bell },
      { name: 'Invitations', href: '/patient/invitations', icon: Mail },
      { name: 'Settings', href: '/patient/settings', icon: Settings },
    ],
    helper: [
      { name: 'Dashboard', href: '/helper/dashboard', icon: Home },
      { name: 'Patients', href: '/helper/patients', icon: PlusCircle },
      { name: 'Settings', href: '/helper/settings', icon: Settings },
    ],
    admin: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
      { name: 'Patients', href: '/admin/patients', icon: PlusCircle },
      { name: 'Alerts', href: '/admin/alerts', icon: AlertTriangle },
      { name: 'Invitations', href: '/admin/invitations', icon: Mail },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  };

  const currentMenuItems = menuItems[role as keyof typeof menuItems] || menuItems.patient;

  return (
    <div className="h-full">
      <nav className="p-4">
        <div className="space-y-1">
          {currentMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group ${
                  isActive ? 'bg-blue-100 text-blue-700' : ''
                }`}
              >
                <Icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                <span className="ml-3 text-sm font-medium group-hover:text-blue-600">{item.name}</span>
              </Link>
            );
          })}
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
  );
}
