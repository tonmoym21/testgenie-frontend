import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TeamPage from './TeamPage';
import EnvironmentsPage from './EnvironmentsPage';
import GlobalsPage from './GlobalsPage';

const TABS = [
  { id: 'team', label: 'Team', render: () => <TeamPage /> },
  { id: 'environments', label: 'Environments', render: () => <EnvironmentsPage /> },
  { id: 'globals', label: 'Globals', render: () => <GlobalsPage /> },
];

export default function SettingsPage() {
  const { canManageTeam } = useAuth();
  const available = TABS.filter((t) => t.id !== 'team' || canManageTeam);
  const [active, setActive] = useState(available[0]?.id || 'environments');
  const current = available.find((t) => t.id === active) || available[0];
  return (
    <div>
      <div className="px-6 pt-6">
        <h1 className="page-title mb-1">Settings</h1>
        <p className="page-subtitle">Team, environments, globals</p>
      </div>
      <div className="px-6 mt-4">
        <nav className="tabs">
          {available.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`tab ${active === t.id ? 'tab-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div>{current && current.render()}</div>
    </div>
  );
}
