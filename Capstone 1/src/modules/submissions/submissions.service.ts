import { submissionsRepository } from './submissions.repository.js';
import { getGeoService } from '../geo/geo.service.js';
import { getNotificationService } from '../notifications/notification.service.js';
import { checkSpam } from '../spam/spam.service.js';
import { SubmissionResponse } from './submissions.schemas.js';

export class SubmissionsService {
  async ingest(data: { widgetId: string; tenantId: string; payload: Record<string, any>; clientIpAddress: string; isHoneypotTriggered: boolean }): Promise<SubmissionResponse> {
    const spamCheck = checkSpam(data.isHoneypotTriggered);
    const geo = await getGeoService().enrich(data.clientIpAddress);
    const submission = await submissionsRepository.create({ widgetId: data.widgetId, tenantId: data.tenantId, payload: data.payload, ipAddress: data.clientIpAddress, geoCountry: geo.country, geoCity: geo.city, isSpam: spamCheck.isSpam });
    getNotificationService().emitSubmissionCreated({ submission: { id: submission.id, widgetId: data.widgetId, tenantId: data.tenantId, payload: data.payload, createdAt: submission.created_at }, geo }).catch(() => {});
    return submission;
  }
  async listByWidget(widgetId: string, _tenantId: string, query: any): Promise<any> { return submissionsRepository.findByWidget(widgetId, query); }
  async listByTenant(tenantId: string, query: any): Promise<any> { return submissionsRepository.findByTenant(tenantId, query); }
  async getStats(widgetId: string): Promise<any> { return submissionsRepository.getStats(widgetId); }
}

export const submissionsService = new SubmissionsService();