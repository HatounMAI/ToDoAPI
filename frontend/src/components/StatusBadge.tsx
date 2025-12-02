import { TaskStatus } from '../App';
import { CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'todo':
        return {
          icon: Circle,
          label: 'To Do',
          className: 'bg-gray-100 text-gray-700'
        };
      case 'in-progress':
        return {
          icon: Clock,
          label: 'In Progress',
          className: 'bg-blue-100 text-blue-700'
        };
      case 'done':
        return {
          icon: CheckCircle2,
          label: 'Done',
          className: 'bg-green-100 text-green-700'
        };
      case 'blocked':
        return {
          icon: AlertCircle,
          label: 'Blocked',
          className: 'bg-red-100 text-red-700'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config.className}`}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </div>
  );
}
