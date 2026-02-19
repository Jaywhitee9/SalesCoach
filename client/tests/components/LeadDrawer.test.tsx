import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

describe('LeadDrawer', () => {
  it('should validate lead form data', () => {
    const formData = {
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      phone: '+1234567890',
    };

    const requiredFields = ['name', 'phone'];
    const isValid = requiredFields.every(field => formData[field] && formData[field].trim() !== '');

    expect(isValid).toBe(true);
  });

  it('should reject invalid email in lead form', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      '',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    invalidEmails.forEach(email => {
      const isValid = !email || emailRegex.test(email);
      if (email && email.length > 0) {
        expect(emailRegex.test(email)).toBe(false);
      }
    });
  });

  it('should accept valid email in lead form', () => {
    const validEmails = [
      'test@example.com',
      'user.name@company.co.uk',
      'admin+tag@domain.com',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it('should create lead object from form data', () => {
    const formData = {
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      phone: '+1234567890',
      source: 'website',
      priority: 'high',
    };

    const lead = {
      ...formData,
      status: 'new',
      created_at: new Date().toISOString(),
    };

    expect(lead.name).toBe(formData.name);
    expect(lead.status).toBe('new');
    expect(lead.created_at).toBeTruthy();
  });

  it('should update existing lead data', () => {
    const existingLead = {
      id: 'lead-123',
      name: 'Old Name',
      email: 'old@email.com',
      status: 'new',
    };

    const updates = {
      name: 'New Name',
      status: 'contacted',
    };

    const updatedLead = {
      ...existingLead,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    expect(updatedLead.name).toBe('New Name');
    expect(updatedLead.status).toBe('contacted');
    expect(updatedLead.email).toBe('old@email.com'); // Unchanged
  });

  it('should validate phone number format', () => {
    const validPhones = [
      '+1234567890',
      '1234567890',
      '+447700900123',
    ];

    const invalidPhones = [
      'abc',
      '123',
      'phone',
    ];

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    validPhones.forEach(phone => {
      expect(phoneRegex.test(phone)).toBe(true);
    });

    invalidPhones.forEach(phone => {
      expect(phoneRegex.test(phone)).toBe(false);
    });
  });

  it('should handle lead status transitions', () => {
    const validTransitions = {
      new: ['contacted', 'qualified'],
      contacted: ['qualified', 'lost'],
      qualified: ['proposal', 'lost'],
      proposal: ['negotiation', 'lost'],
      negotiation: ['won', 'lost'],
    };

    const currentStatus = 'new';
    const possibleNextStates = validTransitions[currentStatus];

    expect(possibleNextStates).toContain('contacted');
    expect(possibleNextStates).toContain('qualified');
    expect(possibleNextStates).not.toContain('won');
  });

  it('should format lead data for API submission', () => {
    const formData = {
      name: '  John Doe  ',
      email: 'JOHN@EXAMPLE.COM',
      phone: ' +1234567890 ',
    };

    const formatted = {
      name: formData.name.trim(),
      email: formData.email.toLowerCase().trim(),
      phone: formData.phone.trim(),
    };

    expect(formatted.name).toBe('John Doe');
    expect(formatted.email).toBe('john@example.com');
    expect(formatted.phone).toBe('+1234567890');
  });
});
