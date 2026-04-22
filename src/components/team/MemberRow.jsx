import { useState } from 'react';
import { MoreVertical, Shield, User, Eye, Crown, UserX, UserCheck, Trash2 } from 'lucide-react';

const ROLE_CONFIG = {
  owner: { label: 'Owner', color: 'bg-yellow-100 text-yellow-700', icon: Crown },
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
  member: { label: 'Member', color: 'bg-blue-100 text-blue-700', icon: User },
  viewer: { label: 'Viewer', color: 'bg-surface-100 text-surface-600', icon: Eye },
};

export default function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
  onDeactivate,
  onReactivate,
  disabled,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isCurrentUser = member.id === currentUserId;
  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin';
  const memberIsOwner = member.role === 'owner';
  const memberIsAdmin = member.role === 'admin';

  // Determine what actions are available
  const canChangeRole = !isCurrentUser && (isOwner || (isAdmin && !memberIsOwner && !memberIsAdmin));
  const canRemove = !isCurrentUser && !memberIsOwner && (isOwner || (isAdmin && !memberIsAdmin));
  const canDeactivate = !isCurrentUser && !memberIsOwner && member.status === 'active' && (isOwner || (isAdmin && !memberIsAdmin));
  const canReactivate = !isCurrentUser && member.status === 'deactivated' && (isOwner || isAdmin);

  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
  const RoleIcon = roleConfig.icon;

  const handleRoleSelect = (role) => {
    setShowRoleMenu(false);
    onRoleChange(member.id, role);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  return (
    <tr className={member.status === 'deactivated' ? 'bg-surface-50 opacity-60' : ''}>
      {/* Member Info */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
            {member.displayName?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-surface-900">
              {member.displayName || member.email.split('@')[0]}
              {isCurrentUser && <span className="ml-2 text-xs text-surface-400">(you)</span>}
            </div>
            <div className="text-sm text-surface-500">{member.email}</div>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="relative">
          <button
            onClick={() => canChangeRole && setShowRoleMenu(!showRoleMenu)}
            disabled={!canChangeRole || disabled}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${roleConfig.color} ${
              canChangeRole ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
            }`}
          >
            <RoleIcon size={12} />
            {roleConfig.label}
          </button>

          {/* Role Dropdown */}
          {showRoleMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowRoleMenu(false)} />
              <div className="absolute left-0 mt-1 w-36 bg-white border border-surface-200 rounded-lg shadow-lg z-20 py-1">
                {!memberIsOwner && (
                  <>
                    {isOwner && (
                      <button
                        onClick={() => handleRoleSelect('admin')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-50 flex items-center gap-2"
                      >
                        <Shield size={14} className="text-purple-600" />
                        Admin
                      </button>
                    )}
                    <button
                      onClick={() => handleRoleSelect('member')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-50 flex items-center gap-2"
                    >
                      <User size={14} className="text-blue-600" />
                      Member
                    </button>
                    <button
                      onClick={() => handleRoleSelect('viewer')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-50 flex items-center gap-2"
                    >
                      <Eye size={14} className="text-surface-600" />
                      Viewer
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-600'
        }`}>
          {member.status}
        </span>
      </td>

      {/* Joined Date */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
        {formatDate(member.joinedAt)}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {(canDeactivate || canReactivate || canRemove) && (
          <div className="relative inline-block">
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={disabled}
              className="p-1 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 disabled:opacity-50"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-40 bg-white border border-surface-200 rounded-lg shadow-lg z-20 py-1">
                  {canDeactivate && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDeactivate(member.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-50 flex items-center gap-2 text-yellow-600"
                    >
                      <UserX size={14} />
                      Deactivate
                    </button>
                  )}
                  {canReactivate && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onReactivate(member.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-50 flex items-center gap-2 text-green-600"
                    >
                      <UserCheck size={14} />
                      Reactivate
                    </button>
                  )}
                  {canRemove && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onRemove(member.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
