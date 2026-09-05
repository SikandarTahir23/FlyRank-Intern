import { widgetsRepository } from './widgets.repository.js';
import { Widget, CreateWidgetInput, UpdateWidgetInput, WidgetConfig, PublicWidgetConfig } from './widgets.schemas.js';
import { OperationalError } from '../../middleware/error.middleware.js';

/**
 * Widget Service - Domain logic for widget management.
 */
export class WidgetsService {
  /**
   * Creates a new widget for a tenant.
   */
  async create(tenantId: string, input: CreateWidgetInput): Promise<Widget> {
    return widgetsRepository.create(tenantId, input);
  }

  /**
   * Gets a widget by ID with tenant isolation.
   */
  async getById(widgetId: string, tenantId: string): Promise<Widget> {
    const widget = await widgetsRepository.findByIdAndTenant(widgetId, tenantId);
    if (!widget) {
      throw new OperationalError('Widget not found', 404, 'NOT_FOUND');
    }
    return widget;
  }

  /**
   * Lists all widgets for a tenant.
   */
  async listByTenant(tenantId: string): Promise<Widget[]> {
    return widgetsRepository.findByTenant(tenantId);
  }

  /**
   * Updates a widget with tenant isolation.
   */
  async update(widgetId: string, tenantId: string, input: UpdateWidgetInput): Promise<Widget> {
    const widget = await widgetsRepository.update(widgetId, tenantId, input);
    if (!widget) {
      throw new OperationalError('Widget not found', 404, 'NOT_FOUND');
    }
    return widget;
  }

  /**
   * Deletes a widget with tenant isolation.
   */
  async delete(widgetId: string, tenantId: string): Promise<void> {
    const deleted = await widgetsRepository.delete(widgetId, tenantId);
    if (!deleted) {
      throw new OperationalError('Widget not found', 404, 'NOT_FOUND');
    }
  }

  /**
   * Gets public widget configuration for rendering.
   * No tenant isolation needed - this is a public endpoint.
   */
  async getPublicConfig(widgetId: string): Promise<PublicWidgetConfig> {
    const result = await widgetsRepository.getPublicConfig(widgetId);
    if (!result) {
      throw new OperationalError('Widget not found or inactive', 404, 'NOT_FOUND');
    }
    
    return {
      id: result.widget.id,
      name: result.widget.name,
      type: result.widget.type,
      config: result.config,
    };
  }

  /**
   * Generates embed code for a widget.
   */
  generateEmbedCode(widgetId: string, baseUrl: string): string {
    return `<script src="${baseUrl}/static/widget.v1.js" data-widget-id="${widgetId}"></script>`;
  }
}

export const widgetsService = new WidgetsService();