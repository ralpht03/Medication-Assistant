"use client"

import { useState, useEffect } from 'react'
import Image from "next/image"
import Link from "next/link"
import { Bell, ChevronDown, Settings, LogOut } from "lucide-react"

interface HeaderProps {
  unreadNotifications?: number
}

const Header = ({ unreadNotifications = 0 }: HeaderProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setUserName(`${user.firstName} ${user.lastName}`)
    }
  }, [])

  return (
    <header className="bg-white shadow-md w-full z-10 flex-shrink-0">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Image
              src="/medicationlogo.png"
              alt="Medication Assistant Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <h1 className="ml-2 text-xl font-semibold text-gray-800 hidden sm:block">Medication Assistant</h1>
          </div>
          <div className="flex items-center">
            <Link
              href="/patient/notifications"
              className="relative mr-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <Bell className="h-6 w-6" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <span className="mr-1">{userName || 'Loading...'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <Link
                    href="/patient/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('user')
                      localStorage.removeItem('token')
                      window.location.href = '/login'
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
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
