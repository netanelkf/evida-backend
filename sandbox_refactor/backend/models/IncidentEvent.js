// IncidentEvent model
import { query } from '../db/pool.js';

export default {
  async findByIncident(incidentId) {
    const result = await query(
      'SELECT * FROM incident_events WHERE incident_id = $1 ORDER BY created_at ASC',
      [incidentId]
    );
    return result.rows;
  },

  async create(data) {
    const { incident_id, event_type, description, actor_id, actor_type, actor_name, metadata } = data;

    const result = await query(`
      INSERT INTO incident_events (incident_id, event_type, description, actor_id, actor_type, actor_name, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [incident_id, event_type, description, actor_id, actor_type, actor_name, JSON.stringify(metadata)]
    );
    return result.rows[0];
  },

  async logCreated(incidentId, actorId, actorType, actorName) {
    return this.create({
      incident_id: incidentId,
      event_type: 'created',
      description: 'Incident created',
      actor_id: actorId,
      actor_type: actorType,
      actor_name: actorName
    });
  },

  async logAssigned(incidentId, operatorId, operatorName) {
    return this.create({
      incident_id: incidentId,
      event_type: 'assigned',
      description: `Assigned to ${operatorName}`,
      actor_id: operatorId,
      actor_type: 'operator',
      actor_name: operatorName
    });
  },

  async logStatusChange(incidentId, newStatus, actorId, actorType, actorName) {
    return this.create({
      incident_id: incidentId,
      event_type: 'status_change',
      description: `Status changed to ${newStatus}`,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: actorName,
      metadata: { new_status: newStatus }
    });
  },

  async logNote(incidentId, note, actorId, actorType, actorName) {
    return this.create({
      incident_id: incidentId,
      event_type: 'note_added',
      description: note,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: actorName
    });
  },

  async logContactAttempt(incidentId, contactType, contactName, actorId, actorName) {
    return this.create({
      incident_id: incidentId,
      event_type: contactType === 'user' ? 'user_contacted' : 'caregiver_contacted',
      description: `Attempted to contact ${contactName}`,
      actor_id: actorId,
      actor_type: 'operator',
      actor_name: actorName,
      metadata: { contact_name: contactName, contact_type: contactType }
    });
  },

  async logResolved(incidentId, resolutionType, actorId, actorType, actorName) {
    return this.create({
      incident_id: incidentId,
      event_type: 'resolved',
      description: `Resolved as ${resolutionType}`,
      actor_id: actorId,
      actor_type: actorType,
      actor_name: actorName,
      metadata: { resolution_type: resolutionType }
    });
  }
};
