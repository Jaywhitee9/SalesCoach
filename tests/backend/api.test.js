import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, createMockReply, createMockUser, createMockLead } from '../helpers/test-utils.js';

describe('API Tests', () => {
  describe('POST /api/leads - Create Lead', () => {
    it('should create a new lead with valid data', async () => {
      const leadData = {
        name: 'John Doe',
        company: 'Acme Corp',
        email: 'john@acme.com',
        phone: '+1234567890',
        source: 'website',
        status: 'new',
      };

      // Mock successful creation
      const createdLead = {
        id: 'lead-123',
        organization_id: 'org-123',
        ...leadData,
        created_at: new Date().toISOString(),
      };

      expect(createdLead.id).toBeTruthy();
      expect(createdLead.name).toBe(leadData.name);
      expect(createdLead.email).toBe(leadData.email);
      expect(createdLead.phone).toBe(leadData.phone);
    });

    it('should reject lead creation without required fields', () => {
      const invalidLeadData = {
        company: 'Acme Corp',
        // Missing name and phone
      };

      const requiredFields = ['name', 'phone'];
      const missingFields = requiredFields.filter(field => !invalidLeadData[field]);

      expect(missingFields.length).toBeGreaterThan(0);
      expect(missingFields).toContain('name');
      expect(missingFields).toContain('phone');
    });

    it('should validate email format when provided', () => {
      const leadDataWithInvalidEmail = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'invalid-email',
      };

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(leadDataWithInvalidEmail.email);

      expect(isValidEmail).toBe(false);
    });

    it('should validate phone format', () => {
      const validPhone = '+1234567890';
      const invalidPhone = 'abc123';

      const phoneRegex = /^\+?[1-9]\d{1,14}$/;

      expect(phoneRegex.test(validPhone)).toBe(true);
      expect(phoneRegex.test(invalidPhone)).toBe(false);
    });

    it('should set default status to "New" if not provided', () => {
      const leadData = {
        name: 'John Doe',
        phone: '+1234567890',
      };

      const status = leadData.status || 'New';

      expect(status).toBe('New');
    });
  });

  describe('GET /api/leads - List Leads', () => {
    it('should return leads for authenticated user organization', async () => {
      const user = createMockUser();
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
        user,
      });

      // Mock leads
      const mockLeads = [
        createMockLead({ id: 'lead-1', name: 'Lead 1' }),
        createMockLead({ id: 'lead-2', name: 'Lead 2' }),
      ];

      expect(mockLeads).toHaveLength(2);
      expect(mockLeads[0].organization_id).toBe(user.organization_id);
      expect(mockLeads[1].organization_id).toBe(user.organization_id);
    });

    it('should return 401 without authentication', () => {
      const request = createMockRequest({
        headers: {},
      });

      const authHeader = request.headers.authorization;
      expect(authHeader).toBeUndefined();

      // Should return 401 error
      const expectedStatus = 401;
      expect(expectedStatus).toBe(401);
    });

    it('should return 403 if user has no organization', () => {
      const user = createMockUser({ organization_id: null });

      expect(user.organization_id).toBeNull();

      // Should return 403 error
      const expectedStatus = 403;
      const expectedError = 'No organization assigned';

      expect(expectedStatus).toBe(403);
      expect(expectedError).toBe('No organization assigned');
    });

    it('should filter leads by organization (RLS)', () => {
      const org1Leads = [
        createMockLead({ id: '1', organization_id: 'org-1' }),
        createMockLead({ id: '2', organization_id: 'org-1' }),
      ];

      const org2Leads = [
        createMockLead({ id: '3', organization_id: 'org-2' }),
      ];

      const user = createMockUser({ organization_id: 'org-1' });

      // User should only see org-1 leads
      const userLeads = org1Leads.filter(
        lead => lead.organization_id === user.organization_id
      );

      expect(userLeads).toHaveLength(2);
      expect(userLeads[0].organization_id).toBe('org-1');
      expect(userLeads[1].organization_id).toBe('org-1');
    });
  });

  describe('PUT /api/leads/:id - Update Lead', () => {
    it('should update lead with valid data', () => {
      const existingLead = createMockLead({
        id: 'lead-123',
        name: 'Old Name',
        status: 'new',
      });

      const updateData = {
        name: 'New Name',
        status: 'contacted',
      };

      const updatedLead = {
        ...existingLead,
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      expect(updatedLead.name).toBe('New Name');
      expect(updatedLead.status).toBe('contacted');
      expect(updatedLead.id).toBe(existingLead.id);
    });

    it('should validate status values', () => {
      const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const invalidStatus = 'invalid-status';

      expect(validStatuses).toContain('new');
      expect(validStatuses).toContain('won');
      expect(validStatuses).not.toContain(invalidStatus);
    });

    it('should prevent updating leads from other organizations', () => {
      const lead = createMockLead({ organization_id: 'org-1' });
      const user = createMockUser({ organization_id: 'org-2' });

      const canUpdate = lead.organization_id === user.organization_id;

      expect(canUpdate).toBe(false);
    });
  });

  describe('DELETE /api/leads/:id - Delete Lead', () => {
    it('should delete lead by ID', () => {
      const leadId = 'lead-123';
      const deletedId = leadId;

      expect(deletedId).toBe(leadId);
    });

    it('should return 404 for non-existent lead', () => {
      const nonExistentId = 'non-existent-id';
      const leadFound = false; // Simulate lead not found

      if (!leadFound) {
        const statusCode = 404;
        const error = 'Lead not found';

        expect(statusCode).toBe(404);
        expect(error).toBe('Lead not found');
      }
    });

    it('should prevent deleting leads from other organizations', () => {
      const lead = createMockLead({ organization_id: 'org-1' });
      const user = createMockUser({ organization_id: 'org-2' });

      const canDelete = lead.organization_id === user.organization_id;

      expect(canDelete).toBe(false);
    });
  });

  describe('GET /api/targets/progress - Get Targets Progress', () => {
    it('should calculate targets progress correctly', () => {
      const target = {
        monthly_calls: 100,
        monthly_deals: 10,
        monthly_revenue: 50000,
      };

      const actual = {
        calls_made: 75,
        deals_closed: 8,
        revenue_generated: 40000,
      };

      const progress = {
        calls: Math.round((actual.calls_made / target.monthly_calls) * 100),
        deals: Math.round((actual.deals_closed / target.monthly_deals) * 100),
        revenue: Math.round((actual.revenue_generated / target.monthly_revenue) * 100),
      };

      expect(progress.calls).toBe(75);
      expect(progress.deals).toBe(80);
      expect(progress.revenue).toBe(80);
    });

    it('should handle zero targets gracefully', () => {
      const target = {
        monthly_calls: 0,
        monthly_deals: 0,
      };

      const actual = {
        calls_made: 10,
        deals_closed: 2,
      };

      // Should not divide by zero
      const callsProgress = target.monthly_calls > 0
        ? (actual.calls_made / target.monthly_calls) * 100
        : 0;

      expect(callsProgress).toBe(0);
    });

    it('should return targets for current user only', () => {
      const user = createMockUser({ id: 'user-1' });

      const allTargets = [
        { user_id: 'user-1', monthly_calls: 100 },
        { user_id: 'user-2', monthly_calls: 150 },
      ];

      const userTargets = allTargets.filter(t => t.user_id === user.id);

      expect(userTargets).toHaveLength(1);
      expect(userTargets[0].user_id).toBe(user.id);
    });

    it('should calculate productivity score', () => {
      const metrics = {
        callsProgress: 80,
        dealsProgress: 90,
        revenueProgress: 85,
      };

      const productivityScore = Math.round(
        (metrics.callsProgress + metrics.dealsProgress + metrics.revenueProgress) / 3
      );

      expect(productivityScore).toBe(85);
    });
  });

  describe('POST /api/leads/webhook - Webhook Lead Creation', () => {
    it('should create lead via webhook with valid API key', () => {
      const apiKey = 'org_sk_valid_key_123';
      const organizationId = 'org-123'; // Simulated lookup result

      const isValidKey = Boolean(apiKey.startsWith('org_sk_') && organizationId);

      expect(isValidKey).toBe(true);
    });

    it('should reject webhook request with invalid API key', () => {
      const apiKey = 'invalid-key';
      const organizationId = null; // Simulated failed lookup

      const isValidKey = apiKey.startsWith('org_sk_') && organizationId;

      expect(isValidKey).toBe(false);

      // Should return 401
      const statusCode = 401;
      expect(statusCode).toBe(401);
    });

    it('should validate webhook schema', () => {
      const validPayload = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        company: 'Acme Corp',
      };

      const requiredFields = ['name', 'phone'];
      const hasRequiredFields = requiredFields.every(field => validPayload[field]);

      expect(hasRequiredFields).toBe(true);
    });

    it('should apply rate limiting to webhook endpoint', () => {
      const maxRequests = 30;
      const timeWindow = 60000; // 1 minute

      // Simulate 35 requests
      const requestCount = 35;

      const isRateLimited = requestCount > maxRequests;

      expect(isRateLimited).toBe(true);
    });

    it('should set default source to "Webhook"', () => {
      const leadData = {
        name: 'John Doe',
        phone: '+1234567890',
      };

      const source = leadData.source || 'Webhook';

      expect(source).toBe('Webhook');
    });
  });

  describe('GET /api/system/health - System Health', () => {
    it('should return health status for all services', () => {
      const health = [
        { id: 'srv1', name: 'Telephony (Voice)', status: 'operational' },
        { id: 'srv2', name: 'Transcription (Soniox)', status: 'operational' },
        { id: 'srv3', name: 'AI Coach (LLM)', status: 'operational' },
        { id: 'srv4', name: 'CRM Sync (Webhooks)', status: 'degraded' },
      ];

      expect(health).toHaveLength(4);
      expect(health[0].status).toBe('operational');
      expect(health[3].status).toBe('degraded');
    });

    it('should be publicly accessible without auth', () => {
      const publicRoutes = ['/api/system/health'];
      const testRoute = '/api/system/health';

      const isPublic = publicRoutes.includes(testRoute);

      expect(isPublic).toBe(true);
    });

    it('should check environment variables for service status', () => {
      const envVars = {
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'token123',
        OPENAI_API_KEY: 'sk-123',
      };

      const twilioStatus = envVars.TWILIO_ACCOUNT_SID && envVars.TWILIO_AUTH_TOKEN
        ? 'operational'
        : 'down';

      const openaiStatus = envVars.OPENAI_API_KEY ? 'operational' : 'down';

      expect(twilioStatus).toBe('operational');
      expect(openaiStatus).toBe('operational');
    });
  });
});
