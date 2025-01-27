"use client"

import { useState } from "react"
import Image from "next/image"
import { Bell, ChevronDown, User } from "lucide-react"

const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Image src="/logo.svg" alt="MediTrack Logo" width={40} height={40} />
            <h1 className="ml-2 text-xl font-semibold text-gray-800">Dashboard</h1>
          </div>
          <div className="flex items-center">
            <div className="relative mr-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10">
                  <div className="px-4 py-2 text-sm text-gray-700">You have a new notification.</div>
                  <div className="px-4 py-2 text-sm text-gray-700">Remember to take your medication at 2 PM.</div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <User className="h-6 w-6 mr-1" />
                <span className="mr-1">John Doe</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profile
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Settings
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Logout
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header

