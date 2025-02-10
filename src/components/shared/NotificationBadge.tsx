import { Bell, Info, AlertTriangle, AlertCircle } from 'lucide-react'

type NotificationType = 'info' | 'warning' | 'error'

interface NotificationBadgeProps {
  type?: NotificationType
  count?: number
  message: string
  timestamp?: string
  onClick?: () => void
  className?: string
}

const typeConfig = {
  info: {
    icon: Info,
    colors: 'bg-blue-100 text-blue-800',
    iconColor: 'text-blue-500'
  },
  warning: {
    icon: AlertTriangle,
    colors: 'bg-yellow-100 text-yellow-800',
    iconColor: 'text-yellow-500'
  },
  error: {
    icon: AlertCircle,
    colors: 'bg-red-100 text-red-800',
    iconColor: 'text-red-500'
  }
}

const NotificationBadge = ({
  type = 'info',
  count,
  message,
  timestamp,
  onClick,
  className = ''
}: NotificationBadgeProps) => {
  const { icon: Icon, colors, iconColor } = typeConfig[type]

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-start p-4 rounded-lg
        ${colors}
        ${onClick ? 'cursor-pointer hover:opacity-90' : ''}
        ${className}
      `}
    >
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      
      {count !== undefined && count > 0 && (
        <div className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
          {count > 99 ? '99+' : count}
        </div>
      )}

      <div className="ml-3 w-0 flex-1">
        <p className="text-sm font-medium">{message}</p>
        {timestamp && (
          <p className="mt-1 text-sm opacity-75">{timestamp}</p>
        )}
      </div>

      {onClick && (
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-sm opacity-75 hover:opacity-100 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <span className="sr-only">View notification</span>
            <Bell className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default NotificationBadge