/**
 * Task entity type definitions
 * Represents tasks and to-dos for users
 */

export interface Task {
  id: string;
  owner_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at?: string;
  completed_at?: string;

  // Relations (populated in queries)
  leads?: {
    id: string;
    full_name?: string;
    name?: string;
    company?: string;
    phone?: string;
  };
}

export interface DashboardTask {
  id: string;
  title: string;
  leadName: string;
  dueDate: string;
  rawDate?: string;
  completed: boolean;
  ownerId?: string;
}
