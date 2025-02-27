import { Users, Bell, Calendar, CheckCircle } from "lucide-react"

interface OverviewCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

const OverviewCard = ({ title, value, icon, trend }: OverviewCardProps) => (
  <div className="bg-white rounded-lg shadow-sm p-4">
    <div className="flex items-center">
      <div className="p-2 bg-blue-50 rounded-lg">
        {icon}
      </div>
      <div className="ml-3">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <div className="flex items-center">
          <p className="text-lg font-semibold">{value}</p>
          {trend && (
            <span className={`text-xs ml-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
)

const AdminDashboardOverview = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <OverviewCard
        title="Total Patients"
        value={248}
        icon={<Users className="h-5 w-5 text-blue-600" />}
        trend={{ value: 12, isPositive: true }}
      />
      
      <OverviewCard
        title="Pending Alerts"
        value={15}
        icon={<Bell className="h-5 w-5 text-blue-600" />}
        trend={{ value: 5, isPositive: false }}
      />
      
      <OverviewCard
        title="Today's Schedule"
        value={32}
        icon={<Calendar className="h-5 w-5 text-blue-600" />}
      />
      
      <OverviewCard
        title="Adherence Rate"
        value="92%"
        icon={<CheckCircle className="h-5 w-5 text-blue-600" />}
        trend={{ value: 3, isPositive: true }}
      />
    </div>
  )
}

export default AdminDashboardOverview