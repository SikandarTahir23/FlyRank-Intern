import { submissionsRepository } from './submissions.repository.js';
import { getGeoService } from '../geo/geo.service.js';
import { getNotificationService } from '../notifications/notification.service.js';
import { checkSpam } from '../spam/spam.service.js';
import { SubmissionResponse, CreateSubmissionInput } from './submissions.schemas.js';
import { OperationalError } from '../../middleware/error.middleware.js';

/**
 * Submission Service - Ingestion Pipeline Orchestration.
 * 
 * This service coordinates the full submission ingestion pipeline:
 * 1. Validates widget exists and is active
 * 2. Checks honeypot (set by middleware)
 * 3. Enriches with geo data (fallback chain)
 * 4. Determines spam status
 * 5. Persists to database
 * 6. Triggers decoupled async side effects (non-blocking)
 * 
 * CRITICAL: Side effect failures (email, webhooks) MUST NOT affect
 * the primary database transaction or HTTP response.
 */
export class SubmissionsService {
  /**
   * Processes a form submission through the full ingestion pipeline.
   * 
   * @param widgetId - Widget identifier from X-Widget-Id header
   * @param tenantId - Tenant identifier (from widget lookup)
   * @param payload - Form submission payload
   * @param clientIpAddress - Client IP address
   * @param isHoneypotTriggered - Whether honeypot field was filled (set by middleware)
   * @returns Submission response with ID, timestamp, and geo data
   */
  async ingest(data: {
    widgetId: string;
    tenantId: string;
    payload: Record<string, any>;
    clientIpAddress: string;
    isHoneypotTriggered: boolean;
  }): Promise<SubmissionResponse> {
    // 1. Validate widget exists and is active (done in controller middleware)
    
    // 2. Check honeypot - already done in middleware, result passed in
    const spamCheck = checkSpam(data.isHoneypotTriggered);
    
    // 3. Geo enrichment with fallback chain
    const geoService = getGeoService();
    const geo = await geoService.enrich(data.clientIpAddress);
    
    // 4. Persist to database
    const submission = await submissionsRepository.create({
      widgetId: data.widgetId,
      tenantId: data.tenantId,
      payload: data.payload,
      ipAddress: data.clientIpAddress,
      geoCountry: geo.country,
      geoCity: geo.city,
      isSpam: spamCheck.isSpam,
    });
    
    // 5. Trigger decoupled async side effects (FIRE AND FORGET)
    // This is intentionally NOT awaited - errors are handled internally
    // and MUST NOT affect the HTTP response
    const notificationService = getNotificationService();
    notificationService.emitSubmissionCreated({
      submission: {
        id: submission.id,
        widgetId: data.widgetId,
        tenantId: data.tenantId,
        payload: data.payload,
        createdAt: submission.created_at,
      },
      geo,
    }).catch(() => {
      // Error already logged in notification service
      // This empty catch is intentional - we never want to throw from here
    });
    
    return submission;
  }

  /**
   * Lists submissions for a widget (admin).
   */
  async listByWidget(widgetId: string, tenantId: string, query: any): Promise<any> {
    // Verify widget belongs to tenant
    // (In practice, this check would be done by fetching widget first)
    
    return submissionsRepository.findByWidget(widgetId, query);
  }

  /**
   * Lists submissions for a tenant (admin).
   */
  async listByTenant(tenantId: string, query: any): Promise<any> {
    return submissionsRepository.findByTenant(tenantId, query);
  }

  /**
   * Gets dashboard stats for a widget.
   */
  async getStats(widgetId: string): Promise<any> {
    return submissionsRepository.getStats(widgetId);
  }
}

export const submissionsService = new SubmissionsService();