import { useState } from 'react';
import { Task, TaskStatus } from '../App';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface CalendarPageProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export function CalendarPage({ tasks, onUpdateTask }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => {
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      const checkDate = new Date(dateStr);
      return checkDate >= taskStart && checkDate <= taskEnd;
    });
  };

  const getSelectedDateTasks = () => {
    if (!selectedDate) return [];
    const [y, m, d] = selectedDate.split('-').map(Number);
    return getTasksForDate(d);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-600">View your tasks in a calendar layout</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={previousMonth}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const tasksForDay = getTasksForDate(day);
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : isToday(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="mb-1">{day}</span>
                    {tasksForDay.length > 0 && (
                      <div className="flex gap-1">
                        {tasksForDay.slice(0, 3).map((task, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.status === 'done'
                                ? 'bg-green-500'
                                : task.status === 'in-progress'
                                ? 'bg-blue-500'
                                : task.status === 'blocked'
                                ? 'bg-red-500'
                                : 'bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600 mb-3">Task Status:</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-gray-600">To Do</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600">Done</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600">Blocked</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Date Tasks */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-4">
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Select a date'}
          </h2>

          <div className="space-y-4">
            {selectedDate ? (
              getSelectedDateTasks().length > 0 ? (
                getSelectedDateTasks().map(task => (
                  <div
                    key={task.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="text-gray-900 mb-2">{task.title}</p>
                    <p className="text-gray-600 mb-3">{task.description}</p>
                    <div className="mb-3">
                      <div className="px-2 py-1 bg-white text-gray-700 rounded inline-block">
                        {task.category}
                      </div>
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white mb-2"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                    <StatusBadge status={task.status} />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No tasks for this date</p>
              )
            ) : (
              <p className="text-gray-500 text-center py-8">
                Click on a date to view tasks
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
