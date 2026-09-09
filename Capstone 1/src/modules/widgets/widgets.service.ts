import { widgetsRepository } from './widgets.repository.js';
import { Widget, CreateWidgetInput, UpdateWidgetInput, PublicWidgetConfig } from './widgets.schemas.js';
import { OperationalError } from '../../middleware/error.middleware.js';

export class WidgetsService {
  async create(tenantId: string, input: CreateWidgetInput): Promise<Widget> { return widgetsRepository.create(tenantId, input); }
  async getById(widgetId: string, tenantId: string): Promise<Widget> {
    const widget = await widgetsRepository.findByIdAndTenant(widgetId, tenantId);
    if (!widget) throw new OperationalError('Widget not found', 404, 'NOT_FOUND');
    return widget;
  }
  async listByTenant(tenantId: string): Promise<Widget[]> { return widgetsRepository.findByTenant(tenantId); }
  async update(widgetId: string, tenantId: string, input: UpdateWidgetInput): Promise<Widget> {
    const widget = await widgetsRepository.update(widgetId, tenantId, input);
    if (!widget) throw new OperationalError('Widget not found', 404, 'NOT_FOUND');
    return widget;
  }
  async delete(widgetId: string, tenantId: string): Promise<void> {
    const deleted = await widgetsRepository.delete(widgetId, tenantId);
    if (!deleted) throw new OperationalError('Widget not found', 404, 'NOT_FOUND');
  }
  async getPublicConfig(widgetId: string): Promise<PublicWidgetConfig> {
    const result = await widgetsRepository.getPublicConfig(widgetId);
    if (!result) throw new OperationalError('Widget not found or inactive', 404, 'NOT_FOUND');
    return { id: result.widget.id, name: result.widget.name, type: result.widget.type, config: result.config };
  }
  generateEmbedCode(widgetId: string, baseUrl: string): string { return `<script src="${baseUrl}/static/widget.v1.js" data-widget-id="${widgetId}"></script>`; }
}

export const widgetsService = new WidgetsService();