import { query } from '../../config/database.js';
import { Tenant, CreateTenantInput, generateApiKey } from './tenants.schemas.js';

export class TenantsRepository {
  async create(input: CreateTenantInput): Promise<Tenant> {
    const apiKey = generateApiKey(input.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8));
    const result = await query<Tenant>(`INSERT INTO tenants (name, api_key) VALUES ($1, $2) RETURNING id, name, api_key, created_at`, [input.name, apiKey]);
    return result.rows[0];
  }

  async findByApiKey(apiKey: string): Promise<Tenant | null> {
    const result = await query<Tenant>(`SELECT id, name, api_key, created_at FROM tenants WHERE api_key = $1`, [apiKey]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<Tenant | null> {
    const result = await query<Tenant>(`SELECT id, name, api_key, created_at FROM tenants WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<Tenant[]> {
    const result = await query<Tenant>(`SELECT id, name, api_key, created_at FROM tenants ORDER BY created_at DESC`);
    return result.rows;
  }

  async update(id: string, name: string): Promise<Tenant | null> {
    const result = await query<Tenant>(`UPDATE tenants SET name = $1 WHERE id = $2 RETURNING id, name, api_key, created_at`, [name, id]);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(`DELETE FROM tenants WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const tenantsRepository = new TenantsRepository();