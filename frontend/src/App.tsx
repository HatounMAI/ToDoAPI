import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { todoAPI, Todo, TodoCreate, TodoUpdate } from './services/api';
import { HomePage } from './components/HomePage';
import { TasksPage } from './components/TasksPage';
import { CalendarPage } from './components/CalendarPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AdminPage } from './components/AdminPage';
import { LogOut, Crown, ChevronDown } from 'lucide-react';

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  createdAt: string;
  category: string;
}

// Helper function to convert backend Todo to frontend Task
function todoToTask(todo: Todo): Task {
  return {
    id: todo.id.toString(),
    title: todo.title,
    description: todo.description || '',
    status: todo.status as TaskStatus,
    priority: todo.priority as TaskPriority,
    startDate: todo.start_date,
    endDate: todo.end_date,
    createdAt: todo.created_at,
    category: todo.category,
  };
}

// Helper function to convert frontend Task to backend TodoCreate/TodoUpdate
function taskToTodoCreate(task: Omit<Task, 'id' | 'createdAt'>): TodoCreate {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    start_date: task.startDate,
    end_date: task.endDate,
    category: task.category,
  };
}

function taskToTodoUpdate(updates: Partial<Task>): TodoUpdate {
  const todoUpdate: TodoUpdate = {};
  if (updates.title !== undefined) todoUpdate.title = updates.title;
  if (updates.description !== undefined) todoUpdate.description = updates.description;
  if (updates.status !== undefined) todoUpdate.status = updates.status;
  if (updates.priority !== undefined) todoUpdate.priority = updates.priority;
  if (updates.startDate !== undefined) todoUpdate.start_date = updates.startDate;
  if (updates.endDate !== undefined) todoUpdate.end_date = updates.endDate;
  if (updates.category !== undefined) todoUpdate.category = updates.category;
  return todoUpdate;
}

type Page = 'home' | 'tasks' | 'calendar' | 'admin';
type AuthPage = 'login' | 'register';

function AppContent() {
  const { user, isAuthenticated, loading: authLoading, login, register, logout, isAdmin } = useAuth();
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [currentPage, setCurrentPage] = useState<Page>('tasks');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch todos from backend
  useEffect(() => {
    const loadTasks = async () => {
      if (!isAuthenticated || !user) {
        setTasks([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const todos = await todoAPI.getTodos();
        setTasks(todos.map(todoToTask));
      } catch (err: any) {
        console.error('Failed to load tasks:', err);
        setError(err.message || 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [isAuthenticated, user]);

  // Task handlers with API calls
  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const todoCreate = taskToTodoCreate(task);
      const newTodo = await todoAPI.createTodo(todoCreate);
      setTasks([...tasks, todoToTask(newTodo)]);
    } catch (err: any) {
      console.error('Failed to create task:', err);
      alert('Failed to create task: ' + (err.message || 'Unknown error'));
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const todoUpdate = taskToTodoUpdate(updates);
      const updatedTodo = await todoAPI.updateTodo(parseInt(id), todoUpdate);
      setTasks(tasks.map(task => task.id === id ? todoToTask(updatedTodo) : task));
    } catch (err: any) {
      console.error('Failed to update task:', err);
      alert('Failed to update task: ' + (err.message || 'Unknown error'));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await todoAPI.deleteTodo(parseInt(id));
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task: ' + (err.message || 'Unknown error'));
    }
  };

  // Auth handlers
  const handleLogin = async (username: string, password: string) => {
    await login({ username, password });
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    await register({ username, email, password });
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('tasks');
    setShowProfileDropdown(false);
    setTasks([]);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth pages if not authenticated
  if (!isAuthenticated) {
    if (authPage === 'register') {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthPage('login')}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthPage('register')}
      />
    );
  }

  // Main app (authenticated)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white">✓</span>
              </div>
              <span className="text-gray-900">TaskFlow</span>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage('tasks')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'tasks'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setCurrentPage('calendar')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'calendar'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'home'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Dashboard
              </button>

              {/* Admin Button (only for admins) */}
              {user?.is_admin && (
                <button
                  onClick={() => setCurrentPage('admin')}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    currentPage === 'admin'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  Admin
                </button>
              )}

              {/* User Profile Dropdown */}
              <div className="relative ml-4">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-900">{user?.username}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-gray-900">{user?.username}</p>
                      <p className="text-gray-600">{user?.email}</p>
                      {user?.is_admin && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          <Crown className="w-3 h-3" />
                          Admin
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>
        {currentPage === 'home' && <HomePage tasks={tasks} />}
        {currentPage === 'tasks' && (
          <TasksPage
            tasks={tasks}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        )}
        {currentPage === 'calendar' && (
          <CalendarPage
            tasks={tasks}
            onUpdateTask={updateTask}
          />
        )}
        {currentPage === 'admin' && user?.is_admin && (
          <AdminPage
            currentUserId={user.id}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
