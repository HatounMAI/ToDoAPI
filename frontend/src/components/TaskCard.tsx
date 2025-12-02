import { Task, TaskStatus } from '../App';
import { Calendar, Edit2, Trash2, Flag } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const isOverdue = () => {
    return new Date(task.endDate) < new Date() && 
           task.status !== 'done' && 
           new Date(task.endDate).toDateString() !== new Date().toDateString();
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-orange-600';
      case 'low':
        return 'text-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-gray-900">{task.title}</h3>
            <Flag className={`w-4 h-4 ${getPriorityColor()}`} />
          </div>
          <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded inline-block">
            {task.category}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(task)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 line-clamp-2">{task.description}</p>

      {/* Dates */}
      <div className="flex items-center gap-4 mb-4 text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>
            {new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <span>→</span>
        <span className={isOverdue() ? 'text-red-600' : ''}>
          {new Date(task.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {isOverdue() && (
        <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 rounded-lg">
          Overdue
        </div>
      )}

      {/* Status Dropdown */}
      <div>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Status Badge */}
      <div className="mt-4">
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
}
