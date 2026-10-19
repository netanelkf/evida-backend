// Caregiver service
import crypto from 'crypto';
import { Caregiver, CaregiverLink, CaregiverInvitation, Subscription, User } from '../models/index.js';
import { hashPassword } from '../utils/password.js';
import { addDays } from '../utils/dateHelpers.js';
import stripeConfig from '../config/stripe.js';

const TIER_LIMITS = {
  free: 1,
  basic: 3,
  premium: 10
};

export async function createInvitation(userId, email, relationship) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const tier = user.subscription_tier || 'free';
  const maxCaregivers = TIER_LIMITS[tier] || 1;

  const currentCount = await CaregiverLink.countByUser(userId);
  if (currentCount >= maxCaregivers) {
    throw new Error(`Your ${tier} plan allows ${maxCaregivers} caregiver(s). Upgrade for more.`);
  }

  const existingInvite = await CaregiverInvitation.findPendingByEmail(userId, email);
  if (existingInvite) {
    throw new Error('Invitation already sent to this email');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = addDays(new Date(), 7);

  const invitation = await CaregiverInvitation.create({
    user_id: userId,
    email,
    token,
    relationship,
    expires_at
  });

  return {
    invitation,
    inviteUrl: `/caregiver/accept/${token}`,
    expiresIn: '7 days'
  };
}

export async function getInvitationByToken(token) {
  const invitation = await CaregiverInvitation.findByToken(token);

  if (!invitation) {
    throw new Error('Invalid invitation link');
  }

  if (invitation.status !== 'pending') {
    throw new Error('Invitation has already been used or expired');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await CaregiverInvitation.updateStatus(invitation.id, 'expired');
    throw new Error('Invitation has expired');
  }

  const user = await User.findById(invitation.user_id);

  return {
    valid: true,
    inviter: {
      name: user.name
    },
    relationship: invitation.relationship,
    expires_at: invitation.expires_at
  };
}

export async function acceptInvitation(token, caregiverId) {
  const invitation = await CaregiverInvitation.findByToken(token);

  if (!invitation || invitation.status !== 'pending') {
    throw new Error('Invalid or expired invitation');
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await CaregiverInvitation.updateStatus(invitation.id, 'expired');
    throw new Error('Invitation has expired');
  }

  const existingLink = await CaregiverLink.findByPair(invitation.user_id, caregiverId);
  if (existingLink) {
    throw new Error('You are already linked to this user');
  }

  const link = await CaregiverLink.create({
    user_id: invitation.user_id,
    caregiver_id: caregiverId,
    relationship: invitation.relationship
  });

  await CaregiverInvitation.markAccepted(invitation.id);

  return link;
}

export async function registerAndAccept(token, data) {
  const invitation = await getInvitationByToken(token);
  if (!invitation.valid) {
    throw new Error('Invalid invitation');
  }

  const { email, password, name, phone } = data;

  const existing = await Caregiver.findByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const password_hash = await hashPassword(password);

  const caregiver = await Caregiver.create({
    email,
    password_hash,
    name,
    phone
  });

  await acceptInvitation(token, caregiver.id);

  return caregiver;
}

export async function getLinkedUsers(caregiverId) {
  const links = await CaregiverLink.findByCaregiver(caregiverId);
  return links.map(link => ({
    linkId: link.id,
    userId: link.user_id,
    userName: link.user_name,
    userEmail: link.user_email,
    userPhone: link.user_phone,
    relationship: link.relationship,
    permissions: {
      can_view_vitals: link.can_view_vitals,
      can_view_location: link.can_view_location,
      can_receive_alerts: link.can_receive_alerts,
      can_receive_critical_only: link.can_receive_critical_only,
      can_contact_dispatch: link.can_contact_dispatch
    },
    linkedAt: link.created_at
  }));
}

export async function getLinkedCaregivers(userId) {
  const links = await CaregiverLink.findByUser(userId);
  return links.map(link => ({
    linkId: link.id,
    caregiverId: link.caregiver_id,
    caregiverName: link.caregiver_name,
    caregiverEmail: link.caregiver_email,
    caregiverPhone: link.caregiver_phone,
    relationship: link.relationship,
    permissions: {
      can_view_vitals: link.can_view_vitals,
      can_view_location: link.can_view_location,
      can_receive_alerts: link.can_receive_alerts,
      can_receive_critical_only: link.can_receive_critical_only,
      can_contact_dispatch: link.can_contact_dispatch
    },
    linkedAt: link.created_at
  }));
}

export async function updatePermissions(userId, linkId, permissions) {
  const link = await CaregiverLink.findById(linkId);

  if (!link || link.user_id !== userId) {
    throw new Error('Not authorized to modify this link');
  }

  await CaregiverLink.updatePermissions(linkId, permissions);
  return { success: true };
}

export async function removeLink(userId, linkId) {
  const link = await CaregiverLink.findById(linkId);

  if (!link || link.user_id !== userId) {
    throw new Error('Not authorized to remove this link');
  }

  await CaregiverLink.remove(linkId);
  return { success: true };
}

export default {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  registerAndAccept,
  getLinkedUsers,
  getLinkedCaregivers,
  updatePermissions,
  removeLink
};
