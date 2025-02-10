import { PlusCircle, UserCog, History } from 'lucide-react'
import ActionButton from './shared/ActionButton'

interface QuickAction {
  id: string
  icon: any // LucideIcon type
  label: string
  variant?: 'primary' | 'secondary' | 'outline'
  onClick: () => void
  disabled?: boolean
}

interface QuickActionsPanelProps {
  className?: string
}

const QuickActionsPanel = ({ className = '' }: QuickActionsPanelProps) => {
  const defaultActions: QuickAction[] = [
    {
      id: 'add-medication',
      icon: PlusCircle,
      label: 'Add New Medication',
      variant: 'primary',
      onClick: () => {
        // Handle add medication
        console.log('Add medication clicked')
      }
    },
    {
      id: 'contact-admin',
      icon: UserCog,
      label: 'Medicine Administrator',
      variant: 'outline',
      onClick: () => {
        // Handle contact admin
        console.log('Contact admin clicked')
      }
    },
    {
      id: 'view-history',
      icon: History,
      label: 'View History',
      variant: 'secondary',
      onClick: () => {
        // Handle view history
        console.log('View history clicked')
      }
    }
  ]

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {defaultActions.map((action) => (
          <ActionButton
            key={action.id}
            icon={action.icon}
            label={action.label}
            variant={action.variant}
            onClick={action.onClick}
            disabled={action.disabled}
            className="w-full"
          />
        ))}
      </div>
    </div>
  )
}

export default QuickActionsPanel