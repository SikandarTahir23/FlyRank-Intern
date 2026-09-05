import { query, transaction } from '../../config/database.js';
import { Tenant, CreateTenantInput, generateApiKey } from './tenants.schemas.js';

/**
 * Tenant Repository - Data access layer for tenants.
 * All database operations for tenants go through here.
 */
export class TenantsRepository {
  /**
   * Creates a new tenant with a generated API key.
   */
  async create(input: CreateTenantInput): Promise<Tenant> {
    const apiKey = generateApiKey(input.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8));
    
    const result = await query<Tenant>(
      `INSERT INTO tenants (name, api_key) VALUES ($1, $2)
       RETURNING id, name, api_key, created_at`,
      [input.name, apiKey]
    );
    
    return result.rows[0];
  }

  /**
   * Finds a tenant by API key.
   * Used for authentication.
   */
  async findByApiKey(apiKey: string): Promise<Tenant | null> {
    const result = await query<Tenant>(
      `SELECT id, name, api_key, created_at FROM tenants WHERE api_key = $1`,
      [apiKey]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Finds a tenant by ID.
   */
  async findById(id: string): Promise<Tenant | null> {
    const result = await query<Tenant>(
      `SELECT id, name, api_key, created_at FROM tenants WHERE id = $1`,
      [id]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Lists all tenants (admin only).
   */
  async findAll(): Promise<Tenant[]> {
    const result = await query<Tenant>(
      `SELECT id, name, api_key, created_at FROM tenants ORDER BY created_at DESC`
    );
    
    return result.rows;
  }

  /**
   * Updates a tenant's name.
   */
  async update(id: string, name: string): Promise<Tenant | null> {
    const result = await query<Tenant>(
      `UPDATE tenants SET name = $1 WHERE id = $2
       RETURNING id, name, api_key, created_at`,
      [name, id]
    );
    
    return result.rows[0] || null;
  }

  /**
   * Deletes a tenant (cascades to widgets and submissions).
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM tenants WHERE id = $1`,
      [id]
    );
    
    return (result.rowCount ?? 0) > 0;
  }
}

export const tenantsRepository = new TenantsRepository();