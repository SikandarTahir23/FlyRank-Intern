import { query, transaction } from '../../config/database.js';
import { Submission, SubmissionResponse, ListSubmissionsQuery } from './submissions.schemas.js';

/**
 * Submission Repository - Data access layer for submissions.
 * Handles high-volume writes and paginated reads for dashboard.
 */
export class SubmissionsRepository {
  /**
   * Creates a new submission.
   * Single INSERT with RETURNING for immediate ID and timestamp.
   */
  async create(data: {
    widgetId: string;
    tenantId: string;
    payload: Record<string, any>;
    ipAddress: string;
    geoCountry: string | null;
    geoCity: string | null;
    isSpam: boolean;
  }): Promise<SubmissionResponse> {
    const result = await query<{ id: string; widget_id: string; created_at: Date; geo_country: string | null; geo_city: string | null }>(
      `INSERT INTO submissions (widget_id, tenant_id, payload_json, ip_address, geo_country, geo_city, is_spam)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, widget_id, created_at, geo_country, geo_city`,
      [
        data.widgetId,
        data.tenantId,
        JSON.stringify(data.payload),
        data.ipAddress,
        data.geoCountry,
        data.geoCity,
        data.isSpam,
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      widget_id: row.widget_id,
      created_at: row.created_at,
      geo: {
        country: row.geo_country,
        city: row.geo_city,
      },
    };
  }

  /**
   * Lists submissions for a widget with pagination and filters.
   * Used by admin dashboard.
   */
  async findByWidget(widgetId: string, queryParams: ListSubmissionsQuery): Promise<{
    submissions: Submission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, is_spam, start_date, end_date } = queryParams;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE widget_id = $1';
    const values: any[] = [widgetId];
    let paramIndex = 2;

    if (is_spam !== undefined) {
      whereClause += ` AND is_spam = $${paramIndex++}`;
      values.push(is_spam);
    }
    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(start_date);
    }
    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(end_date);
    }

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM submissions ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    values.push(limit, offset);
    const dataResult = await query<Submission>(
      `SELECT id, widget_id, tenant_id, payload_json, ip_address, geo_country, geo_city, is_spam, created_at
       FROM submissions ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      submissions: dataResult.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Lists submissions for a tenant (across all widgets).
   */
  async findByTenant(tenantId: string, queryParams: ListSubmissionsQuery): Promise<{
    submissions: Submission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, is_spam, start_date, end_date } = queryParams;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE tenant_id = $1';
    const values: any[] = [tenantId];
    let paramIndex = 2;

    if (is_spam !== undefined) {
      whereClause += ` AND is_spam = $${paramIndex++}`;
      values.push(is_spam);
    }
    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(start_date);
    }
    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      values.push(end_date);
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM submissions ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const dataResult = await query<Submission>(
      `SELECT id, widget_id, tenant_id, payload_json, ip_address, geo_country, geo_city, is_spam, created_at
       FROM submissions ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      submissions: dataResult.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * Gets aggregate statistics for a widget.
   */
  async getStats(widgetId: string): Promise<{
    total: number;
    spam: number;
    byCountry: { country: string; count: number }[];
    byDay: { day: string; count: number }[];
  }> {
    const [totalResult, spamResult, countryResult, dayResult] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM submissions WHERE widget_id = $1`, [widgetId]),
      query<{ count: string }>(`SELECT COUNT(*) FROM submissions WHERE widget_id = $1 AND is_spam = true`, [widgetId]),
      query<{ country: string; count: string }>(
        `SELECT geo_country as country, COUNT(*) as count 
         FROM submissions WHERE widget_id = $1 AND geo_country IS NOT NULL 
         GROUP BY geo_country ORDER BY count DESC LIMIT 10`,
        [widgetId]
      ),
      query<{ day: string; count: string }>(
        `SELECT DATE(created_at) as day, COUNT(*) as count
         FROM submissions WHERE widget_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY day DESC`,
        [widgetId]
      ),
    ]);

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      spam: parseInt(spamResult.rows[0].count, 10),
      byCountry: countryResult.rows.map(r => ({ country: r.country, count: parseInt(r.count, 10) })),
      byDay: dayResult.rows.map(r => ({ day: r.day, count: parseInt(r.count, 10) })),
    };
  }
}

export const submissionsRepository = new SubmissionsRepository();