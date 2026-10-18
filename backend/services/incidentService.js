import pool from '../db/pool.js';

export const INCIDENT_STATUS = {
  NEW: 'NEW',
  TRIAGED: 'TRIAGED',
  CONTACTING: 'CONTACTING',
  CONFIRMED: 'CONFIRMED',
  ESCALATED: 'ESCALATED',
  CLOSED: 'CLOSED'
};

export const PRIORITY = {
  LOW: 'LOW',
  MED: 'MED',
  HIGH: 'HIGH'
};

export const ACTION_TYPE = {
  NOTIFY_CONTACT: 'NOTIFY_CONTACT',
  NOTIFY_OPERATOR: 'NOTIFY_OPERATOR',
  ESCALATE_EMS: 'ESCALATE_EMS'
};

export const CHANNEL = {
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
  PHONE: 'PHONE'
};

export const ACTION_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
};

async function createEventInTx(client, userId, source, type, payload = {}) {
  const result = await client.query(
    `INSERT INTO sos_events (user_id, source, type, payload_json)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, source, type, JSON.stringify(payload)]
  );
  return result.rows[0];
}

async function createIncidentInTx(client, userId, eventId, { priority = PRIORITY.HIGH, location = null, summary = null }) {
  const result = await client.query(
    `INSERT INTO sos_incidents (user_id, event_id, status, priority, location_lat, location_lng, summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      eventId,
      INCIDENT_STATUS.NEW,
      priority,
      location?.lat || null,
      location?.lng || null,
      summary
    ]
  );

  const incident = result.rows[0];

  await client.query(
    `INSERT INTO sos_history (incident_id, from_status, to_status, changed_by, changed_by_role)
     VALUES ($1, NULL, $2, 'SYSTEM', 'SYSTEM')`,
    [incident.id, INCIDENT_STATUS.NEW]
  );

  return incident;
}

async function createActionInTx(client, incidentId, actionType, channel, recipient, payload = {}) {
  const result = await client.query(
    `INSERT INTO sos_actions (incident_id, action_type, channel, recipient, payload_json)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [incidentId, actionType, channel, recipient, JSON.stringify(payload)]
  );
  return result.rows[0];
}

export async function createSOS(userId, { location = null, message = null, caregivers = [] }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const event = await createEventInTx(client, userId, 'USER_APP', 'SOS', { message, location });

    const incident = await createIncidentInTx(client, event.id, event.id, {
      priority: PRIORITY.HIGH,
      location,
      summary: message || 'SOS triggered by user'
    });

    // Fix: use userId not event.id for the incident
    await client.query(
      `UPDATE sos_incidents SET user_id = $1 WHERE id = $2`,
      [userId, incident.id]
    );

    const actions = [];

    if (caregivers.length > 0) {
      for (const caregiver of caregivers) {
        const action = await createActionInTx(
          client,
          incident.id,
          ACTION_TYPE.NOTIFY_CONTACT,
          caregiver.channel || CHANNEL.SMS,
          caregiver.contact,
          { userId, caregiverId: caregiver.id, message: `SOS Alert from ${userId}` }
        );
        actions.push(action);
      }
    } else {
      const action = await createActionInTx(
        client,
        incident.id,
        ACTION_TYPE.NOTIFY_OPERATOR,
        CHANNEL.PUSH,
        'dispatch-operators',
        { userId, message: `SOS Alert from ${userId} - No caregivers configured` }
      );
      actions.push(action);
    }

    await client.query('COMMIT');

    return { event, incident, actions };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Creates a real, operator-visible incident from an automated vital-sign
// alert (ROOK webhook) — not just a log row. Previously, webhook-triggered
// alerts only inserted into sos_events with no linked sos_incidents row,
// so they never appeared in the dispatch incident list at all.
export async function createIncidentFromAlert(userId, { source = 'ROOK_WEBHOOK', type, priority = PRIORITY.MED, summary = null }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const event = await createEventInTx(client, userId, source, type, { summary });
    const incident = await createIncidentInTx(client, userId, event.id, { priority, summary });
    const action = await createActionInTx(
      client,
      incident.id,
      ACTION_TYPE.NOTIFY_OPERATOR,
      CHANNEL.PUSH,
      'dispatch-operators',
      { userId, message: summary }
    );

    await client.query('COMMIT');

    return { event, incident, actions: [action] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getIncidents({ status = null, priority = null, limit = 50, offset = 0 }) {
  let query = `
    SELECT i.*,
           e.type as event_type,
           (SELECT COUNT(*) FROM sos_actions WHERE incident_id = i.id) as action_count,
           (SELECT COUNT(*) FROM sos_notes WHERE incident_id = i.id) as note_count
    FROM sos_incidents i
    LEFT JOIN sos_events e ON i.event_id = e.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND i.status = $${paramIndex++}`;
    params.push(status);
  }

  if (priority) {
    query += ` AND i.priority = $${paramIndex++}`;
    params.push(priority);
  }

  query += ` ORDER BY
    CASE i.priority WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 ELSE 3 END,
    i.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getIncidentById(id) {
  const incidentResult = await pool.query(
    `SELECT i.*, e.type as event_type, e.payload_json as event_payload
     FROM sos_incidents i
     LEFT JOIN sos_events e ON i.event_id = e.id
     WHERE i.id = $1`,
    [id]
  );

  if (incidentResult.rows.length === 0) {
    return null;
  }

  const incident = incidentResult.rows[0];

  const [actionsResult, notesResult, historyResult] = await Promise.all([
    pool.query(
      `SELECT * FROM sos_actions WHERE incident_id = $1 ORDER BY created_at`,
      [id]
    ),
    pool.query(
      `SELECT * FROM sos_notes WHERE incident_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    pool.query(
      `SELECT * FROM sos_history WHERE incident_id = $1 ORDER BY created_at`,
      [id]
    )
  ]);

  return {
    ...incident,
    actions: actionsResult.rows,
    notes: notesResult.rows,
    history: historyResult.rows
  };
}

export async function updateIncidentStatus(id, newStatus, { changedBy = null, changedByRole = 'OPERATOR', note = null }) {
  const currentResult = await pool.query(
    `SELECT status FROM sos_incidents WHERE id = $1`,
    [id]
  );

  if (currentResult.rows.length === 0) {
    return null;
  }

  const oldStatus = currentResult.rows[0].status;

  const updateResult = await pool.query(
    `UPDATE sos_incidents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, id]
  );

  await pool.query(
    `INSERT INTO sos_history (incident_id, from_status, to_status, changed_by, changed_by_role)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, oldStatus, newStatus, changedBy, changedByRole]
  );

  if (note) {
    await addNote(id, changedBy, changedByRole, note);
  }

  return updateResult.rows[0];
}

export async function addNote(incidentId, authorUserId, authorRole, note) {
  const result = await pool.query(
    `INSERT INTO sos_notes (incident_id, author_user_id, author_role, note)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [incidentId, authorUserId, authorRole, note]
  );
  return result.rows[0];
}

export async function getMetrics() {
  const statusCountsResult = await pool.query(
    `SELECT status, COUNT(*) as count FROM sos_incidents GROUP BY status`
  );

  const priorityCountsResult = await pool.query(
    `SELECT priority, COUNT(*) as count FROM sos_incidents WHERE status != 'CLOSED' GROUP BY priority`
  );

  const avgTimeResult = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
     FROM sos_incidents WHERE status = 'CLOSED'`
  );

  const todayCountResult = await pool.query(
    `SELECT COUNT(*) as count FROM sos_incidents WHERE created_at >= CURRENT_DATE`
  );

  const openCountResult = await pool.query(
    `SELECT COUNT(*) as count FROM sos_incidents WHERE status NOT IN ('CLOSED')`
  );

  const statusCounts = {};
  statusCountsResult.rows.forEach(row => {
    statusCounts[row.status] = parseInt(row.count);
  });

  const priorityCounts = {};
  priorityCountsResult.rows.forEach(row => {
    priorityCounts[row.priority] = parseInt(row.count);
  });

  return {
    byStatus: statusCounts,
    byPriority: priorityCounts,
    avgResolutionSeconds: avgTimeResult.rows[0]?.avg_seconds || 0,
    todayCount: parseInt(todayCountResult.rows[0]?.count || 0),
    openCount: parseInt(openCountResult.rows[0]?.count || 0)
  };
}

export async function getPendingActions(limit = 10) {
  const result = await pool.query(
    `SELECT a.*, i.user_id, i.status as incident_status
     FROM sos_actions a
     JOIN sos_incidents i ON a.incident_id = i.id
     WHERE a.status = 'PENDING'
       AND a.next_attempt_at <= NOW()
       AND i.status NOT IN ('CLOSED')
     ORDER BY a.next_attempt_at
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function updateActionStatus(actionId, status, attempts = null) {
  const updateFields = ['status = $1'];
  const params = [status, actionId];
  let paramIndex = 3;

  if (attempts !== null) {
    updateFields.push(`attempts = $${paramIndex++}`);
    params.splice(params.length - 1, 0, attempts);
  }

  if (status === 'PENDING') {
    updateFields.push(`next_attempt_at = NOW() + INTERVAL '5 minutes'`);
  }

  const result = await pool.query(
    `UPDATE sos_actions SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`,
    params
  );
  return result.rows[0];
}
