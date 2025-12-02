import { Task, TaskStatus } from '../App';
import { CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface HomePageProps {
  tasks: Task[];
}

export function HomePage({ tasks }: HomePageProps) {
  const statusCounts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length
  };

  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((statusCounts.done / totalTasks) * 100) : 0;

  const pieData = [
    { name: 'To Do', value: statusCounts.todo, color: '#94a3b8' },
    { name: 'In Progress', value: statusCounts['in-progress'], color: '#3b82f6' },
    { name: 'Done', value: statusCounts.done, color: '#10b981' },
    { name: 'Blocked', value: statusCounts.blocked, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const categoryData = tasks.reduce((acc, task) => {
    const existing = acc.find(item => item.category === task.category);
    if (existing) {
      existing[task.status]++;
      existing.total++;
    } else {
      acc.push({
        category: task.category,
        todo: task.status === 'todo' ? 1 : 0,
        'in-progress': task.status === 'in-progress' ? 1 : 0,
        done: task.status === 'done' ? 1 : 0,
        blocked: task.status === 'blocked' ? 1 : 0,
        total: 1
      });
    }
    return acc;
  }, [] as any[]);

  const upcomingDeadlines = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5);

  const isOverdue = (endDate: string) => {
    return new Date(endDate) < new Date() && new Date(endDate).toDateString() !== new Date().toDateString();
  };

  const isDueSoon = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your tasks and progress at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Circle className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-gray-600">To Do</p>
              <p className="text-gray-900">{statusCounts.todo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600">In Progress</p>
              <p className="text-gray-900">{statusCounts['in-progress']}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600">Done</p>
              <p className="text-gray-900">{statusCounts.done}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-gray-600">Blocked</p>
              <p className="text-gray-900">{statusCounts.blocked}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-4">Task Distribution</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-4">
                <p className="text-gray-600 mb-1">Completion Rate</p>
                <p className="text-gray-900">{completionRate}%</p>
              </div>
              <div className="space-y-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 192, height: 192, minWidth: 192, minHeight: 192 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width={192} height={192}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-4">Tasks by Category</h2>
          {categoryData.length > 0 ? (
            <BarChart width={500} height={250} data={categoryData}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="done" stackId="a" fill="#10b981" name="Done" />
              <Bar dataKey="in-progress" stackId="a" fill="#3b82f6" name="In Progress" />
              <Bar dataKey="todo" stackId="a" fill="#94a3b8" name="To Do" />
              <Bar dataKey="blocked" stackId="a" fill="#ef4444" name="Blocked" />
            </BarChart>
          ) : (
            <div className="flex items-center justify-center text-gray-400" style={{ height: 250 }}>
              No data
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-gray-900 mb-4">Upcoming Deadlines</h2>
        <div className="space-y-3">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500">No upcoming deadlines</p>
          ) : (
            upcomingDeadlines.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-gray-900 mb-1">{task.title}</p>
                  <p className="text-gray-500">{task.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-gray-600">Due Date</p>
                    <p className={`${
                      isOverdue(task.endDate)
                        ? 'text-red-600'
                        : isDueSoon(task.endDate)
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }`}>
                      {new Date(task.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {isOverdue(task.endDate) && (
                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                      Overdue
                    </div>
                  )}
                  {!isOverdue(task.endDate) && isDueSoon(task.endDate) && (
                    <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                      Due Soon
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}