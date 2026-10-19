// Incident service
import { Incident, IncidentEvent, User, VitalsSnapshot, CaregiverLink, Notification } from '../models/index.js';

export async function create(data) {
  const {
    user_id, source_type, source_alert_id, priority, title, description,
    lat, lng, address, vitals_at_incident
  } = data;

  const user = await User.findById(user_id);

  const incident = await Incident.create({
    user_id,
    source_type,
    source_alert_id,
    priority: priority || 'high',
    title: title || `Alert from ${user.name}`,
    description,
    lat: lat || user.last_lat,
    lng: lng || user.last_lng,
    address,
    vitals_at_incident: vitals_at_incident || await VitalsSnapshot.findLatestByUser(user_id)
  });

  await IncidentEvent.logCreated(incident.id, user_id, source_type === 'sos_button' ? 'user' : 'system', user.name);

  await notifyCaregivers(incident, user);

  return incident;
}

export async function createSOS(userId, location) {
  const user = await User.findById(userId);
  const latestVitals = await VitalsSnapshot.findLatestByUser(userId);

  const incident = await create({
    user_id: userId,
    source_type: 'sos_button',
    priority: 'critical',
    title: `SOS Alert from ${user.name}`,
    description: 'User pressed the emergency SOS button',
    lat: location?.lat,
    lng: location?.lng,
    vitals_at_incident: latestVitals
  });

  return incident;
}

async function notifyCaregivers(incident, user) {
  const links = await CaregiverLink.findByUser(incident.user_id);

  const notifications = links.map(link => ({
    recipient_id: link.caregiver_id,
    recipient_type: 'caregiver',
    type: 'incident',
    title: incident.priority === 'critical' ? `URGENT: ${incident.title}` : incident.title,
    body: incident.description,
    channel: 'push',
    data: { incident_id: incident.id, user_id: incident.user_id }
  }));

  await Notification.bulkInsert(notifications);
}

export async function assign(incidentId, operatorId) {
  const operator = await User.findById(operatorId);
  const incident = await Incident.assign(incidentId, operatorId);

  await IncidentEvent.logAssigned(incidentId, operatorId, operator.name);

  return incident;
}

export async function updateStatus(incidentId, status, actorId, actorType, actorName) {
  const incident = await Incident.updateStatus(incidentId, status);
  await IncidentEvent.logStatusChange(incidentId, status, actorId, actorType, actorName);
  return incident;
}

export async function addNote(incidentId, note, actorId, actorType, actorName) {
  await IncidentEvent.logNote(incidentId, note, actorId, actorType, actorName);
  return { success: true };
}

export async function logContactAttempt(incidentId, contactType, contactName, operatorId, operatorName) {
  await IncidentEvent.logContactAttempt(incidentId, contactType, contactName, operatorId, operatorName);
  return { success: true };
}

export async function resolve(incidentId, resolvedBy, resolutionType, resolutionNotes) {
  const resolver = await User.findById(resolvedBy);
  const incident = await Incident.resolve(incidentId, resolvedBy, resolutionType, resolutionNotes);

  await IncidentEvent.logResolved(incidentId, resolutionType, resolvedBy, 'operator', resolver.name);

  return incident;
}

export async function getById(incidentId) {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new Error('Incident not found');
  }

  const events = await IncidentEvent.findByIncident(incidentId);
  const user = await User.findById(incident.user_id);
  const caregivers = await CaregiverLink.findByUser(incident.user_id);

  return {
    ...incident,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      blood_type: user.blood_type,
      allergies: user.allergies,
      medications: user.medications
    },
    caregivers: caregivers.map(c => ({
      name: c.caregiver_name,
      phone: c.caregiver_phone,
      relationship: c.relationship
    })),
    events
  };
}

export async function getQueue() {
  return Incident.findActive();
}

export async function getByUser(userId) {
  return Incident.findByUser(userId);
}

export async function getAssignedTo(operatorId) {
  return Incident.findAssignedTo(operatorId);
}

export async function getStats() {
  return Incident.getStats();
}

export default {
  create,
  createSOS,
  assign,
  updateStatus,
  addNote,
  logContactAttempt,
  resolve,
  getById,
  getQueue,
  getByUser,
  getAssignedTo,
  getStats
};
