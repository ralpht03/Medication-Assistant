"use client";

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { 
  Bell, 
  Shield, 
  User, 
  Clock,
  Smartphone,
  Mail,
  Phone,
  AlertCircle,
  Users
} from 'lucide-react';

interface AdminPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    highPriorityAlerts: boolean;
    patientUpdates: boolean;
  };
  timezone: string;
  language: string;
  maxPatients: number;
  autoAssignPatients: boolean;
}

export default function AdminSettingsPage() {
  const [preferences, setPreferences] = useState<AdminPreferences>({
    notifications: {
      email: true,
      push: true,
      sms: false,
      highPriorityAlerts: true,
      patientUpdates: true,
    },
    timezone: "America/New_York",
    language: "en",
    maxPatients: 50,
    autoAssignPatients: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        
        const user = JSON.parse(userStr);
        const userId = user.id || user.RowKey;
        
        const response = await fetch(`/api/settings?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      }
    };

    fetchSettings();
  }, []);

  const handleNotificationToggle = (type: keyof AdminPreferences['notifications']) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: !prev.notifications[type]
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error('User not found');
      
      const user = JSON.parse(userStr);
      const userId = user.id || user.RowKey;
      
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preferences
        })
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout userType="admin" title="Admin Settings">
      {message.text && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Notification Preferences */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <span>Email Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.email}
                  onChange={() => handleNotificationToggle('email')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 text-gray-400 mr-2" />
                <span>Push Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.push}
                  onChange={() => handleNotificationToggle('push')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                <span>High Priority Alerts</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.highPriorityAlerts}
                  onChange={() => handleNotificationToggle('highPriorityAlerts')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <span>Patient Updates</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.notifications.patientUpdates}
                  onChange={() => handleNotificationToggle('patientUpdates')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Time Zone Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Time Zone
          </h2>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={preferences.timezone}
            onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
          </select>
        </div>

        {/* Language Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Language
          </h2>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={preferences.language}
            onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>

        {/* Patient Management Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Patient Management
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maximum Number of Patients
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={preferences.maxPatients || 50}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setPreferences(prev => ({ 
                    ...prev, 
                    maxPatients: isNaN(value) ? 50 : Math.min(Math.max(value, 1), 1000)
                  }));
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span>Auto-assign New Patients</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.autoAssignPatients}
                  onChange={(e) => setPreferences(prev => ({ ...prev, autoAssignPatients: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-md text-white ${
              isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </PageLayout>
  );
} 