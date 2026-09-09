import { tenantsRepository } from './tenants.repository.js';
import { Tenant, CreateTenantInput } from './tenants.schemas.js';
import { OperationalError } from '../../middleware/error.middleware.js';

export class TenantsService {
  async create(input: CreateTenantInput): Promise<Tenant> {
    const existing = await tenantsRepository.findAll();
    if (existing.some(t => t.name.toLowerCase() === input.name.toLowerCase())) throw new OperationalError('Tenant with this name already exists', 409, 'CONFLICT');
    return tenantsRepository.create(input);
  }

  async getByApiKey(apiKey: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findByApiKey(apiKey);
    if (!tenant) throw new OperationalError('Invalid API key', 401, 'UNAUTHORIZED');
    return tenant;
  }

  async getById(id: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) throw new OperationalError('Tenant not found', 404, 'NOT_FOUND');
    return tenant;
  }

  async list(): Promise<Tenant[]> { return tenantsRepository.findAll(); }

  async update(id: string, name: string): Promise<Tenant> {
    const tenant = await tenantsRepository.update(id, name);
    if (!tenant) throw new OperationalError('Tenant not found', 404, 'NOT_FOUND');
    return tenant;
  }

  async delete(id: string): Promise<void> {
    const deleted = await tenantsRepository.delete(id);
    if (!deleted) throw new OperationalError('Tenant not found', 404, 'NOT_FOUND');
  }
}

export const tenantsService = new TenantsService();