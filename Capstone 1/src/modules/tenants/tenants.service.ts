import { tenantsRepository } from './tenants.repository.js';
import { Tenant, CreateTenantInput } from './tenants.schemas.js';
import { OperationalError } from '../../middleware/error.middleware.js';

/**
 * Tenant Service - Domain logic for tenant management.
 * Handles business rules and orchestrates repository operations.
 */
export class TenantsService {
  /**
   * Creates a new tenant.
   */
  async create(input: CreateTenantInput): Promise<Tenant> {
    // Check for duplicate name
    const existing = await tenantsRepository.findAll();
    if (existing.some(t => t.name.toLowerCase() === input.name.toLowerCase())) {
      throw new OperationalError('Tenant with this name already exists', 409, 'CONFLICT');
    }
    
    return tenantsRepository.create(input);
  }

  /**
   * Gets a tenant by API key (for authentication).
   */
  async getByApiKey(apiKey: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findByApiKey(apiKey);
    if (!tenant) {
      throw new OperationalError('Invalid API key', 401, 'UNAUTHORIZED');
    }
    return tenant;
  }

  /**
   * Gets a tenant by ID.
   */
  async getById(id: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new OperationalError('Tenant not found', 404, 'NOT_FOUND');
    }
    return tenant;
  }

  /**
   * Lists all tenants.
   */
  async list(): Promise<Tenant[]> {
    return tenantsRepository.findAll();
  }

  /**
   * Updates a tenant.
   */
  async update(id: string, name: string): Promise<Tenant> {
    const tenant = await tenantsRepository.update(id, name);
    if (!tenant) {
      throw new OperationalError('Tenant not found', 404, 'NOT_FOUND');
    }
    return tenant;
  }

  /**
   * Deletes a tenant.
   */
  async delete(id: string): Promise<void> {
    const deleted = await tenantsRepository.delete(id);
    if (!deleted) {
      throw new OperationalError('Tenant not found', 404, 'NOT_FOUND');
    }
  }
}

export const tenantsService = new TenantsService();