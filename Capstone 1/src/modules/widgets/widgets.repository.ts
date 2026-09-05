import { query } from '../../config/database.js';
import { Widget, CreateWidgetInput, UpdateWidgetInput, WidgetConfig } from './widgets.schemas.js';

/**
 * Widget Repository - Data access layer for widgets.
 */
export class WidgetsRepository {
  /**
   * Creates a new widget for a tenant.
   */
  async create(tenantId: string, input: CreateWidgetInput): Promise<Widget> {
    const result = await query<Widget>(
      `INSERT INTO widgets (tenant_id, name, type, config_json, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, name, type, config_json, is_active, created_at`,
      [tenantId, input.name, input.type, JSON.stringify(input.config_json), input.is_active]
    );
    
    return result.rows[0];
  }

  /**
   * Finds a widget by ID.
   */
  async findById(id: string): Promise<Widget | null> {
    const result = await query<Widget>(
      `SELECT id, tenant_id, name, type, config_json, is_active, created_at
       FROM widgets WHERE id = $1`,
      [id]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Finds a widget by ID with tenant check (for tenant isolation).
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Widget | null> {
    const result = await query<Widget>(
      `SELECT id, tenant_id, name, type, config_json, is_active, created_at
       FROM widgets WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Lists all widgets for a tenant.
   */
  async findByTenant(tenantId: string): Promise<Widget[]> {
    const result = await query<Widget>(
      `SELECT id, tenant_id, name, type, config_json, is_active, created_at
       FROM widgets WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    
    return result.rows;
  }

  /**
   * Lists all active widgets for a tenant.
   */
  async findActiveByTenant(tenantId: string): Promise<Widget[]> {
    const result = await query<Widget>(
      `SELECT id, tenant_id, name, type, config_json, is_active, created_at
       FROM widgets WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC`,
      [tenantId]
    );
    
    return result.rows;
  }

  /**
   * Updates a widget.
   */
  async update(id: string, tenantId: string, input: UpdateWidgetInput): Promise<Widget | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(input.type);
    }
    if (input.config_json !== undefined) {
      fields.push(`config_json = $${paramIndex++}`);
      values.push(JSON.stringify(input.config_json));
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    if (fields.length === 0) {
      return this.findByIdAndTenant(id, tenantId);
    }

    values.push(id, tenantId);
    
    const result = await query<Widget>(
      `UPDATE widgets SET ${fields.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING id, tenant_id, name, type, config_json, is_active, created_at`,
      values
    );
    
    return result.rows[0] || null;
  }

  /**
   * Deletes a widget.
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM widgets WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Gets public widget config (for widget.js rendering).
   * Returns null if widget not found or inactive.
   */
  async getPublicConfig(widgetId: string): Promise<{ widget: Widget; config: WidgetConfig } | null> {
    const result = await query<Widget>(
      `SELECT id, tenant_id, name, type, config_json, is_active, created_at
       FROM widgets WHERE id = $1 AND is_active = true`,
      [widgetId]
    );
    
    const widget = result.rows[0];
    if (!widget) return null;
    
    return {
      widget,
      config: widget.config_json as WidgetConfig,
    };
  }
}

export const widgetsRepository = new WidgetsRepository();