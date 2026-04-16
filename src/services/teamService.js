import { api } from './api';

/**
 * Team Management API service
 */
export const teamApi = {
  // ─────────────────────────────────────────────────────────────────────────
  // ORGANIZATION
  // ─────────────────────────────────────────────────────────────────────────

  async getOrganization() {
    return api.request('GET', '/team/organization');
  },

  async updateOrganization(data) {
    return api.request('PATCH', '/team/organization', data);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MEMBERS
  // ─────────────────────────────────────────────────────────────────────────

  async listMembers(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.role) query.set('role', params.role);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    const queryStr = query.toString();
    return api.request('GET', `/team/members${queryStr ? '?' + queryStr : ''}`);
  },

  async getMember(userId) {
    return api.request('GET', `/team/members/${userId}`);
  },

  async updateMemberRole(userId, role) {
    return api.request('PATCH', `/team/members/${userId}/role`, { role });
  },

  async removeMember(userId) {
    return api.request('DELETE', `/team/members/${userId}`);
  },

  async deactivateMember(userId) {
    return api.request('POST', `/team/members/${userId}/deactivate`);
  },

  async reactivateMember(userId) {
    return api.request('POST', `/team/members/${userId}/reactivate`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INVITES
  // ─────────────────────────────────────────────────────────────────────────

  async listInvites(status = 'pending') {
    return api.request('GET', `/team/invites?status=${status}`);
  },

  async createInvite(email, role = 'member') {
    return api.request('POST', '/team/invites', { email, role });
  },

  async bulkInvite(invites) {
    return api.request('POST', '/team/invites/bulk', { invites });
  },

  async resendInvite(inviteId) {
    return api.request('POST', `/team/invites/${inviteId}/resend`);
  },

  async revokeInvite(inviteId) {
    return api.request('DELETE', `/team/invites/${inviteId}`);
  },

  /** Public — fetches invite metadata without auth. */
  async getInviteInfo(token) {
    return api.publicRequest('GET', `/team/invite-info?token=${encodeURIComponent(token)}`);
  },

  /**
   * Accept an invite.
   *  - If `api` has a valid access token, send it (logged-in acceptance).
   *  - If not, call without auth. Backend returns 401 AUTH_REQUIRED_FOR_INVITE
   *    which the UI surfaces as "please sign in or register" instead of the
   *    confusing generic "Missing or malformed authorization header".
   */
  async acceptInvite(token) {
    if (api.isAuthenticated()) {
      return api.request('POST', '/team/accept-invite', { token });
    }
    return api.publicRequest('POST', '/team/accept-invite', { token });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DOMAINS
  // ─────────────────────────────────────────────────────────────────────────

  async listDomains() {
    return api.request('GET', '/team/domains');
  },

  async addDomain(domain) {
    return api.request('POST', '/team/domains', { domain });
  },

  async removeDomain(domainId) {
    return api.request('DELETE', `/team/domains/${domainId}`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AUDIT LOGS
  // ─────────────────────────────────────────────────────────────────────────

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.action) query.set('action', params.action);
    if (params.actorId) query.set('actorId', params.actorId);
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    const queryStr = query.toString();
    return api.request('GET', `/team/audit-logs${queryStr ? '?' + queryStr : ''}`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CURRENT USER TEAM INFO
  // ─────────────────────────────────────────────────────────────────────────

  async getMyTeamInfo() {
    return api.request('GET', '/team/me');
  },
};
