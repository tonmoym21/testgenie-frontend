import { useState } from 'react';
import { X, Plus, Trash2, Send, AlertCircle, CheckCircle, Copy, Check, Link2 } from 'lucide-react';
import { teamApi } from '../../services/teamService';

export default function InviteModal({ isOwner, onClose, onSuccess }) {
  const [invites, setInvites] = useState([{ email: '', role: 'member' }]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  const handleAddRow = () => {
    if (invites.length >= 10) return;
    setInvites([...invites, { email: '', role: 'member' }]);
  };

  const handleRemoveRow = (index) => {
    if (invites.length <= 1) return;
    setInvites(invites.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...invites];
    updated[index][field] = value;
    setInvites(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty emails
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) return;

    setLoading(true);
    setResults(null);

    try {
      if (validInvites.length === 1) {
        // Single invite
        const result = await teamApi.createInvite(validInvites[0].email, validInvites[0].role);
        setResults({ created: [result], errors: [] });
      } else {
        // Bulk invite
        const result = await teamApi.bulkInvite(validInvites);
        setResults(result);
      }
    } catch (err) {
      setResults({ created: [], errors: [{ email: validInvites[0]?.email, error: err.message }] });
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (results?.created?.length > 0) {
      onSuccess();
    } else {
      onClose();
    }
  };

  const copyInviteLink = (inviteUrl) => {
    const fullUrl = `${window.location.origin}${inviteUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(inviteUrl);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const hasValidEmails = invites.some((inv) => inv.email.trim());

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Invite Team Members</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!results ? (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600 mb-4">
                Enter email addresses to invite. They'll receive an invitation link valid for 7 days.
              </p>

              <div className="space-y-3">
                {invites.map((invite, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="colleague@company.com"
                        value={invite.email}
                        onChange={(e) => handleChange(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <select
                      value={invite.role}
                      onChange={(e) => handleChange(index, 'role', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                      {isOwner && <option value="admin">Admin</option>}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={invites.length <= 1}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {invites.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={16} />
                  Add another
                </button>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !hasValidEmails}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Invites
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* Success results */}
              {results.created.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-green-600 mb-3">
                    <CheckCircle size={18} />
                    <span className="font-medium">
                      {results.created.length} invite{results.created.length !== 1 ? 's' : ''} created
                    </span>
                  </div>
                  
                  {/* Invite Links - Show even if email sent */}
                  <div className="space-y-3">
                    {results.created.map((inv, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{inv.email}</span>
                            {inv.reused && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                Refreshed
                              </span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            inv.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {inv.role}
                          </span>
                        </div>
                        
                        {/* Email status */}
                        {inv.emailSent ? (
                          <div className="text-xs text-green-600 mb-2 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Email sent successfully
                          </div>
                        ) : inv.mailDisabled ? (
                          <div className="text-xs text-blue-700 mb-2 flex items-center gap-1">
                            <Link2 size={12} />
                            Email delivery is disabled — share the invite link manually
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Email not sent — share link manually
                          </div>
                        )}
                        
                        {/* Invite Link */}
                        {inv.inviteUrl && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 font-mono truncate">
                              {window.location.origin}{inv.inviteUrl}
                            </div>
                            <button
                              onClick={() => copyInviteLink(inv.inviteUrl)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Copy invite link"
                            >
                              {copiedLink === inv.inviteUrl ? (
                                <Check size={16} className="text-green-600" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <Link2 size={12} />
                    Copy and share the invite link(s) with your team members
                  </p>
                </div>
              )}

              {/* Error results */}
              {results.errors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <AlertCircle size={18} />
                    <span className="font-medium">
                      {results.errors.length} invite{results.errors.length !== 1 ? 's' : ''} failed
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {results.errors.map((err, i) => (
                      <li key={i} className="text-sm text-red-600 pl-6">
                        • {err.email}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleDone}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
