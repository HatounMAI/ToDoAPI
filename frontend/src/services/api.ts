// API Configuration
// When running through Docker/nginx proxy, use '/api'
// For local development, use 'http://localhost:8000'
const API_BASE_URL = '/api';

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  email_verified: boolean;
  profile_picture: string | null;
  created_at: string;
}

export interface ProfileUpdate {
  username?: string;
  email?: string;
  profile_picture?: string | null;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Todo {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  category: string;
  created_at: string;
  user_id: number;
}

export interface TodoCreate {
  title: string;
  description?: string;
  completed?: boolean;
  status?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
}

export interface TodoUpdate {
  title?: string;
  description?: string;
  completed?: boolean;
  status?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  category?: string;
}

export interface AdminStats {
  users: {
    total: number;
    admins: number;
    active: number;
  };
  todos: {
    total: number;
    completed: number;
    pending: number;
    by_status: Record<string, number>;
  };
}

// Token Management
export const getToken = (): string | null => {
  const token = localStorage.getItem('auth_token');
  return token;
};

export const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// API Helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Authentication API
export class AuthAPI {
  static async register(userData: UserCreate): Promise<TokenResponse> {
    const response = await apiRequest<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setToken(response.access_token);
    return response;
  }

  static async login(credentials: UserLogin): Promise<TokenResponse> {
    const response = await apiRequest<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setToken(response.access_token);
    return response;
  }

  static async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/auth/me');
  }

  static async updateProfile(profileData: ProfileUpdate): Promise<User> {
    return apiRequest<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  static logout(): void {
    removeToken();
  }
}

// Todo API
export class TodoAPI {
  static async getTodos(completed?: boolean): Promise<Todo[]> {
    const query = completed !== undefined ? `?completed=${completed}` : '';
    return apiRequest<Todo[]>(`/todos${query}`);
  }

  static async getTodo(id: number): Promise<Todo> {
    return apiRequest<Todo>(`/todos/${id}`);
  }

  static async createTodo(todo: TodoCreate): Promise<Todo> {
    return apiRequest<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify(todo),
    });
  }

  static async updateTodo(id: number, updates: TodoUpdate): Promise<Todo> {
    return apiRequest<Todo>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  static async deleteTodo(id: number): Promise<void> {
    await apiRequest<void>(`/todos/${id}`, {
      method: 'DELETE',
    });
  }

  static async getStats(): Promise<any> {
    return apiRequest<any>('/stats');
  }
}

// Admin API
export class AdminAPI {
  static async getAllUsers(): Promise<User[]> {
    return apiRequest<User[]>('/admin/users');
  }

  static async getUser(userId: number): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}`);
  }

  static async getUserTodos(userId: number): Promise<Todo[]> {
    return apiRequest<Todo[]>(`/admin/users/${userId}/todos`);
  }

  static async deleteUser(userId: number): Promise<void> {
    await apiRequest<void>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  static async toggleAdminRole(userId: number): Promise<User> {
    return apiRequest<User>(`/admin/users/${userId}/role`, {
      method: 'PUT',
    });
  }

  static async getSystemStats(): Promise<AdminStats> {
    return apiRequest<AdminStats>('/admin/stats');
  }
}

// Export instances
export const authAPI = AuthAPI;
export const todoAPI = TodoAPI;
export const adminAPI = AdminAPI;
