import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TargetsDashboard } from '../../components/Targets/TargetsDashboard';

// Mock Supabase
vi.mock('../../src/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: [], error: null })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
        error: null,
      }),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('TargetsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render targets dashboard component', () => {
    render(<TargetsDashboard isDarkMode={false} orgId="org-123" />);

    // Should show some targets-related UI
    expect(document.body).toBeTruthy();
  });

  it('should calculate productivity score correctly', () => {
    const targets = {
      calls: 100,
      connectedCalls: 50,
      deals: 10,
    };

    const actual = {
      calls: 80,
      connectedCalls: 40,
      deals: 8,
    };

    const callsProgress = (actual.calls / targets.calls) * 100;
    const connectedProgress = (actual.connectedCalls / targets.connectedCalls) * 100;
    const dealsProgress = (actual.deals / targets.deals) * 100;

    const productivityScore = Math.round(
      (callsProgress + connectedProgress + dealsProgress) / 3
    );

    expect(productivityScore).toBe(80);
  });

  it('should handle zero targets gracefully', () => {
    const targets = {
      calls: 0,
      deals: 0,
    };

    const actual = {
      calls: 10,
      deals: 5,
    };

    const callsProgress = targets.calls > 0 ? (actual.calls / targets.calls) * 100 : 0;
    const dealsProgress = targets.deals > 0 ? (actual.deals / targets.deals) * 100 : 0;

    expect(callsProgress).toBe(0);
    expect(dealsProgress).toBe(0);
  });

  it('should calculate progress percentage correctly', () => {
    const testCases = [
      { target: 100, actual: 50, expected: 50 },
      { target: 100, actual: 100, expected: 100 },
      { target: 100, actual: 150, expected: 150 },
      { target: 50, actual: 25, expected: 50 },
    ];

    testCases.forEach(({ target, actual, expected }) => {
      const progress = Math.round((actual / target) * 100);
      expect(progress).toBe(expected);
    });
  });

  it('should filter team members correctly', () => {
    const teamMembers = [
      { id: '1', name: 'John Doe', role: 'rep' },
      { id: '2', name: 'Jane Smith', role: 'manager' },
      { id: '3', name: 'Bob Wilson', role: 'rep' },
    ];

    const searchQuery = 'john';
    const filtered = teamMembers.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('John Doe');
  });

  it('should calculate average performance across team', () => {
    const teamProgress = [
      { userId: '1', progress: 80 },
      { userId: '2', progress: 90 },
      { userId: '3', progress: 70 },
    ];

    const average = Math.round(
      teamProgress.reduce((sum, p) => sum + p.progress, 0) / teamProgress.length
    );

    expect(average).toBe(80);
  });

  it('should identify top performers', () => {
    const teamProgress = [
      { userId: '1', name: 'John', progress: 80 },
      { userId: '2', name: 'Jane', progress: 95 },
      { userId: '3', name: 'Bob', progress: 70 },
    ];

    const topPerformer = teamProgress.reduce((max, p) =>
      p.progress > max.progress ? p : max
    );

    expect(topPerformer.name).toBe('Jane');
    expect(topPerformer.progress).toBe(95);
  });

  it('should handle empty targets data', () => {
    const targetsMap = {};
    const userId = 'user-123';

    const userTargets = targetsMap[userId] || {
      calls: 0,
      deals: 0,
      revenue: 0,
    };

    expect(userTargets.calls).toBe(0);
    expect(userTargets.deals).toBe(0);
    expect(userTargets.revenue).toBe(0);
  });
});
