import React from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'repair', label: 'Repair Section', icon: '🔧' },
    { id: 'rental', label: 'Rent Section', icon: '🚲' },
    { id: 'coupons', label: 'Coupon Management', icon: '🎫' },
    { id: 'promotional', label: 'Promotional Cards', icon: '📱' },
    { id: 'users', label: 'User Management', icon: '👥' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Cycle-Bees Admin</h2>
      </div>
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => onSectionChange(section.id)}
          >
            <span className="sidebar-icon">{section.icon}</span>
            <span className="sidebar-label">{section.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 