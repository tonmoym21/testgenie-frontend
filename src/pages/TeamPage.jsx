import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamApi } from '../services/teamService';
import InviteModal from '../components/team/InviteModal';
import MemberRow from '../components/team/MemberRow';
import { Users, Mail, Globe, Shield, Plus, Search, AlertTriangle, Building2, RefreshCw } from 'lucide-react';

const TABS = [
  { id: 'members', label: 'Members', icon: Users },
  { id: 'invites', label: 'Pending Invites', icon: Mail },
  { id: 'domains', label: 'Allowed Domains', icon: Globe },
];

export default function TeamPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [newDomain, setNewDomain] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user can manage team
  const canManage = organization?.userRole === 'owner' || organization?.userRole === 'admin';
  const isOwner = organization?.userRole === 'owner';

  const fetchOrganization = useCallback(async () => {
    try {
      const org = await teamApi.getOrganization();
      setOrganization(org);
      return org;
    } catch (err) {
      if (err.status === 404) {
        setOrganization(null);
        return null;
      }
      setError(err.message);
      return null;
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const result = await teamApi.listMembers({
        status: statusFilter,
        role: roleFilter || undefined,
        search: searchQuery || undefined,
      });
      setMembers(result.members || []);
    } catch (err) {
      setError(err.message);
    }
  }, [statusFilter, roleFilter, searchQuery]);

  const fetchInvites = useCallback(async () => {
    try {
      const result = await teamApi.listInvites('pending');
      setInvites(result.invites || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchDomains = useCallback(async () => {
    try {
      const result = await teamApi.listDomains();
      setDomains(result.domains || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /**
   * Load everything. Does NOT depend on canManage (which is derived from
   * `organization` state) — instead, uses the fresh org returned from
   * fetchOrganization to decide whether to fetch manage-only data. This avoids
   * the classic "first-load shows 0 counts" race where canManage was false
   * during the only call.
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const org = await fetchOrganization();
      const canManageFresh = org && (org.userRole === 'owner' || org.userRole === 'admin');
      if (canManageFresh) {
        await Promise.all([fetchMembers(), fetchInvites(), fetchDomains()]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchOrganization, fetchMembers, fetchInvites, fetchDomains]);

  // Initial load — run loadData once when the component mounts. The
  // dependency on loadData is stable (useCallback) so this effect does not
  // re-fire spuriously, but it WILL re-fire if loadData's deps actually change.
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canManage && activeTab === 'members') {
      fetchMembers();
    }
  }, [statusFilter, roleFilter, searchQuery, canManage, activeTab, fetchMembers]);

  // Action handlers
  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      await teamApi.updateMemberRole(userId, newRole);
      await fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;
    setActionLoading(true);
    try {
      await teamApi.removeMember(userId);
      await fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this member?')) return;
    setActionLoading(true);
    try {
      await teamApi.deactivateMember(userId);
      await fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (userId) => {
    setActionLoading(true);
    try {
      await teamApi.reactivateMember(userId);
      await fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async (inviteId) => {
    setActionLoading(true);
    try {
      const result = await teamApi.resendInvite(inviteId);
      await fetchInvites();
      // Show the fresh invite URL to the admin — mail is parked, so they need
      // to copy/share the link manually.
      if (result?.inviteUrl) {
        const fullUrl = `${window.location.origin}${result.inviteUrl}`;
        try {
          await navigator.clipboard.writeText(fullUrl);
          alert(`Invite link regenerated and copied to clipboard:\n\n${fullUrl}`);
        } catch {
          // clipboard not available (e.g. http or permission denied)
          window.prompt('Invite link regenerated. Copy this link:', fullUrl);
        }
      } else {
        alert('Invite resent successfully');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;
    setActionLoading(true);
    try {
      await teamApi.revokeInvite(inviteId);
      await fetchInvites();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setActionLoading(true);
    try {
      await teamApi.addDomain(newDomain.trim().toLowerCase());
      setNewDomain('');
      await fetchDomains();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDomain = async (domainId) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    setActionLoading(true);
    try {
      await teamApi.removeDomain(domainId);
      await fetchDomains();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDomainRestriction = async () => {
    setActionLoading(true);
    try {
      await teamApi.updateOrganization({
        domainRestrictionEnabled: !organization.domainRestrictionEnabled,
      });
      await fetchOrganization();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteSuccess = async () => {
    setShowInviteModal(false);
    // Refresh BOTH invites (new pending rows) and members (bulk-invites that
    // join existing users may also update member lists) so counts are always live.
    await Promise.all([fetchInvites(), fetchMembers()]);
    // Auto-switch to Invites tab so the admin immediately sees the new link(s).
    setActiveTab('invites');
  };

  // Not part of organization
  if (!loading && !organization) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto text-center py-16">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organization</h2>
          <p className="text-gray-600">
            You're not part of any organization yet. Contact your team admin for an invite, or create a new account with your company email.
          </p>
        </div>
      </div>
    );
  }

  // Not authorized to manage team
  if (!loading && organization && !canManage) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto text-center py-16">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to manage team settings. Contact your organization admin.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600">Your organization: <span className="font-medium">{organization.name}</span></p>
            <p className="text-sm text-gray-600">Your role: <span className="font-medium capitalize">{organization.userRole}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          {organization && (
            <p className="text-gray-500 mt-1">
              {organization.name} • {organization.domain}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Invite Members
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = tab.id === 'members' ? members.length : tab.id === 'invites' ? invites.length : domains.length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={18} />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Members Tab */}
      {!loading && activeTab === 'members' && (
        <div>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Members List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    currentUserId={user?.id}
                    currentUserRole={organization?.userRole}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                    onDeactivate={handleDeactivate}
                    onReactivate={handleReactivate}
                    disabled={actionLoading}
                  />
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invites Tab */}
      {!loading && activeTab === 'invites' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invited By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invites.map((invite) => (
                <tr key={invite.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{invite.email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      invite.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {invite.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invite.invitedByEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invite.isExpired ? (
                      <span className="text-red-600">Expired</span>
                    ) : (
                      new Date(invite.expiresAt).toLocaleDateString()
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleResendInvite(invite.id)}
                      disabled={actionLoading}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium mr-4 disabled:opacity-50"
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No pending invites
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Domains Tab */}
      {!loading && activeTab === 'domains' && (
        <div>
          {/* Domain Restriction Toggle */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Domain Restriction</h3>
                <p className="text-sm text-gray-500 mt-1">
                  When enabled, only users with approved email domains can be invited or join.
                </p>
              </div>
              <button
                onClick={handleToggleDomainRestriction}
                disabled={actionLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  organization?.domainRestrictionEnabled ? 'bg-brand-600' : 'bg-gray-200'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    organization?.domainRestrictionEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {organization?.domainRestrictionEnabled && domains.length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-700 text-sm">
                <AlertTriangle size={16} />
                Domain restriction is enabled but no domains are configured. Add at least one domain.
              </div>
            )}
          </div>

          {/* Add Domain Form */}
          <form onSubmit={handleAddDomain} className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="flex-1 max-w-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!newDomain.trim() || actionLoading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus size={18} />
              Add Domain
            </button>
          </form>

          {/* Domains List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Primary domain (from organization) */}
                {organization?.domain && (
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">{organization.domain}</span>
                      <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Primary</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">—</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">—</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-400">
                      Cannot remove
                    </td>
                  </tr>
                )}
                {domains.map((domain) => (
                  <tr key={domain.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{domain.domain}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {domain.created_by_email || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(domain.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRemoveDomain(domain.id)}
                        disabled={actionLoading}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {domains.length === 0 && !organization?.domain && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No allowed domains configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          isOwner={isOwner}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
}
