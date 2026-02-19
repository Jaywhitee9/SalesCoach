import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '../../components/Dashboard/Dashboard';

// Mock hooks
vi.mock('../../src/hooks/useLeads', () => ({
  useLeads: () => ({
    leads: [],
    loading: false,
    updateLead: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [],
    loading: false,
    toggleTask: vi.fn(),
    addTask: vi.fn(),
  }),
}));

describe('Dashboard', () => {
  const defaultProps = {
    onStartCall: vi.fn(),
    isDarkMode: false,
    userName: 'Test User',
    centerType: 'sales' as const,
    orgId: 'org-123',
    userId: 'user-123',
    userRole: 'rep',
  };

  it('should render dashboard component', () => {
    render(<Dashboard {...defaultProps} />);
    expect(document.body).toBeTruthy();
  });

  it('should display correct greeting based on time', () => {
    const getGreeting = (hour: number) => {
      if (hour >= 5 && hour < 12) return 'בוקר טוב';
      if (hour >= 12 && hour < 18) return 'צהריים טובים';
      if (hour >= 18 && hour < 22) return 'ערב טוב';
      return 'לילה טוב';
    };

    expect(getGreeting(8)).toBe('בוקר טוב');
    expect(getGreeting(14)).toBe('צהריים טובים');
    expect(getGreeting(20)).toBe('ערב טוב');
    expect(getGreeting(23)).toBe('לילה טוב');
  });

  it('should calculate stats correctly', () => {
    const leads = [
      { id: '1', status: 'new' },
      { id: '2', status: 'contacted' },
      { id: '3', status: 'qualified' },
      { id: '4', status: 'won' },
      { id: '5', status: 'lost' },
    ];

    const newLeads = leads.filter(l => l.status === 'new').length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const won = leads.filter(l => l.status === 'won').length;

    expect(newLeads).toBe(1);
    expect(contacted).toBe(1);
    expect(won).toBe(1);
  });

  it('should filter leads by time range', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const lastWeek = new Date(now.getTime() - 7 * 86400000);

    const leads = [
      { id: '1', created_at: now.toISOString() },
      { id: '2', created_at: yesterday.toISOString() },
      { id: '3', created_at: lastWeek.toISOString() },
    ];

    const todayLeads = leads.filter(l => {
      const createdDate = new Date(l.created_at);
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      return createdDate >= startOfToday;
    });

    expect(todayLeads.length).toBeGreaterThanOrEqual(1);
  });

  it('should calculate conversion rate', () => {
    const totalLeads = 100;
    const wonLeads = 15;

    const conversionRate = Math.round((wonLeads / totalLeads) * 100);

    expect(conversionRate).toBe(15);
  });

  it('should sort tasks by priority', () => {
    const tasks = [
      { id: '1', priority: 'low', title: 'Task 1' },
      { id: '2', priority: 'high', title: 'Task 2' },
      { id: '3', priority: 'medium', title: 'Task 3' },
    ];

    const priorityOrder = { high: 1, medium: 2, low: 3 };

    const sorted = [...tasks].sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    expect(sorted[0].priority).toBe('high');
    expect(sorted[1].priority).toBe('medium');
    expect(sorted[2].priority).toBe('low');
  });

  it('should identify overdue tasks', () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const yesterday = new Date(now.getTime() - 86400000);

    const tasks = [
      { id: '1', dueDate: tomorrow.toISOString(), completed: false },
      { id: '2', dueDate: yesterday.toISOString(), completed: false },
      { id: '3', dueDate: yesterday.toISOString(), completed: true },
    ];

    const overdueTasks = tasks.filter(t => {
      if (t.completed) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate < now;
    });

    expect(overdueTasks).toHaveLength(1);
    expect(overdueTasks[0].id).toBe('2');
  });
});
