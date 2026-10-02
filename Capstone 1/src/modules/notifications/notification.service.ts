import { createTransport, Transporter } from 'nodemailer';
import { logger, createChildLogger } from '../../utils/logger.js';
import { getConfig } from '../../config/index.js';

/**
 * Notification Service - Decoupled async side effects.
 * 
 * Handles post-submission notifications (email, webhook, etc.).
 * CRITICAL: Failures here MUST NOT affect the primary submission response.
 * All operations are fire-and-forget with isolated error boundaries.
 * 
 * This ensures the visitor gets a fast 201 response regardless of
 * notification delivery status.
 */
export class NotificationService {
  private mailer: Transporter | null = null;
  private config = getConfig();

  constructor() {
    this.initializeMailer();
  }

  private initializeMailer(): void {
    try {
      this.mailer = createTransport({
        host: this.config.MAILPIT_HOST,
        port: this.config.MAILPIT_PORT,
        ignoreTLS: true,
      });

      // Verify connection on startup
      this.mailer.verify().then(() => {
        logger.info('Mailpit connection verified');
      }).catch((err: Error) => {
        logger.warn({ err }, 'Mailpit connection failed - notifications will log only');
        this.mailer = null;
      });
    } catch (error) {
      logger.warn({ err: error }, 'Failed to initialize mailer');
    }
  }

  /**
   * Emits a submission.created event.
   * Fire-and-forget: errors are caught and logged but not propagated.
   * 
   * @param event - Submission event data
   */
  async emitSubmissionCreated(event: {
    submission: {
      id: string;
      widgetId: string;
      tenantId: string;
      payload: Record<string, any>;
      createdAt: Date;
    };
    geo: {
      country: string | null;
      city: string | null;
    };
  }): Promise<void> {
    // Fire-and-forget with isolated error boundary
    this.processNotification(event).catch((error) => {
      // This error is intentionally NOT re-thrown
      // It's logged for monitoring but doesn't affect the HTTP response
      const notificationLogger = createChildLogger({
        eventType: 'submission.created',
        submissionId: event.submission.id,
        error: String(error),
      });
      notificationLogger.error('Notification side effect failed (non-blocking)');
    });
  }

  /**
   * Internal notification processing.
   * Separated to allow clean error isolation.
   */
  private async processNotification(event: {
    submission: {
      id: string;
      widgetId: string;
      tenantId: string;
      payload: Record<string, any>;
      createdAt: Date;
    };
    geo: {
      country: string | null;
      city: string | null;
    };
  }): Promise<void> {
    const { submission, geo } = event;
    
    // 1. Console log (always works)
    logger.info({
      event: 'submission.created',
      submissionId: submission.id,
      widgetId: submission.widgetId,
      tenantId: submission.tenantId,
      geo,
      timestamp: submission.createdAt,
    }, 'New submission received');

    // 2. Email notification (if mailer available)
    if (this.mailer) {
      await this.sendEmailNotification(submission, geo);
    }
  }

  /**
   * Sends email notification via Mailpit.
   * Errors are caught and logged but not thrown.
   */
  private async sendEmailNotification(
    submission: { id: string; widgetId: string; tenantId: string; payload: Record<string, any>; createdAt: Date },
    geo: { country: string | null; city: string | null }
  ): Promise<void> {
    if (!this.mailer) return;

    try {
      const html = this.generateEmailHtml(submission, geo);
      const text = this.generateEmailText(submission, geo);

      await this.mailer.sendMail({
        from: this.config.MAILPIT_FROM,
        to: 'admin@widget.local', // In production, this would be tenant-specific
        subject: `New Submission - Widget ${submission.widgetId}`,
        text,
        html,
      });

      logger.debug({ submissionId: submission.id }, 'Email notification sent');
    } catch (error) {
      // Log but don't throw - this is a side effect
      logger.warn({ err: error, submissionId: submission.id }, 'Failed to send email notification');
    }
  }

  private generateEmailHtml(
    submission: { id: string; widgetId: string; tenantId: string; payload: Record<string, any>; createdAt: Date },
    geo: { country: string | null; city: string | null }
  ): string {
    const fieldsHtml = Object.entries(submission.payload)
      .map(([key, value]) => `<tr><td><strong>${key}</strong></td><td>${String(value)}</td></tr>`)
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>New Submission</title></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>New Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr><td><strong>Submission ID</strong></td><td>${submission.id}</td></tr>
          <tr><td><strong>Widget ID</strong></td><td>${submission.widgetId}</td></tr>
          <tr><td><strong>Tenant ID</strong></td><td>${submission.tenantId}</td></tr>
          <tr><td><strong>Received</strong></td><td>${submission.createdAt.toISOString()}</td></tr>
          <tr><td><strong>Geo</strong></td><td>${geo.country || 'Unknown'}, ${geo.city || 'Unknown'}</td></tr>
        </table>
        <h3>Form Data</h3>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          ${fieldsHtml}
        </table>
      </body>
      </html>
    `;
  }

  private generateEmailText(
    submission: { id: string; widgetId: string; tenantId: string; payload: Record<string, any>; createdAt: Date },
    geo: { country: string | null; city: string | null }
  ): string {
    const fieldsText = Object.entries(submission.payload)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');

    return `
New Form Submission

Submission ID: ${submission.id}
Widget ID: ${submission.widgetId}
Tenant ID: ${submission.tenantId}
Received: ${submission.createdAt.toISOString()}
Geo: ${geo.country || 'Unknown'}, ${geo.city || 'Unknown'}

Form Data:
${fieldsText}
    `.trim();
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

export function resetNotificationService(): void {
  notificationServiceInstance = null;
}