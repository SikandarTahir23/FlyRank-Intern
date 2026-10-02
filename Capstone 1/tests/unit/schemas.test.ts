import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { 
  createTenantSchema, 
  tenantSchema 
} from '../../src/modules/tenants/tenants.schemas.js';
import { 
  createWidgetSchema, 
  widgetConfigSchema,
  publicWidgetConfigSchema 
} from '../../src/modules/widgets/widgets.schemas.js';
import { 
  createSubmissionSchema, 
  submissionResponseSchema 
} from '../../src/modules/submissions/submissions.schemas.js';

describe('Schema Validation', () => {
  describe('Tenant Schemas', () => {
    it('should validate create tenant input', () => {
      const valid = { name: 'Test Tenant' };
      const result = createTenantSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalid = { name: '' };
      const result = createTenantSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject name too long', () => {
      const invalid = { name: 'a'.repeat(256) };
      const result = createTenantSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Widget Schemas', () => {
    const validConfig = {
      title: 'Test Form',
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'name', label: 'Name', type: 'text', required: true },
      ],
      buttonText: 'Submit',
      honeypotFieldName: 'website',
    };

    it('should validate widget config', () => {
      const result = widgetConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject config with no fields', () => {
      const invalid = { ...validConfig, fields: [] };
      const result = widgetConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject config with too many fields', () => {
      const invalid = { 
        ...validConfig, 
        fields: Array(21).fill({ name: 'f', label: 'F', type: 'text', required: false }) 
      };
      const result = widgetConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate create widget input', () => {
      const valid = { name: 'Test Widget', config_json: validConfig };
      const result = createWidgetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate public widget config response', () => {
      const valid = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Test Widget',
        type: 'lead-form',
        config: validConfig,
      };
      const result = publicWidgetConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Submission Schemas', () => {
    it('should accept any payload (passthrough)', () => {
      const payload = { email: 'test@example.com', name: 'Test', customField: 'value' };
      const result = createSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate submission response', () => {
      const valid = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        widget_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        created_at: new Date(),
        geo: { country: 'US', city: 'San Francisco' },
      };
      const result = submissionResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept null geo in response', () => {
      const valid = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        widget_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        created_at: new Date(),
        geo: { country: null, city: null },
      };
      const result = submissionResponseSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});