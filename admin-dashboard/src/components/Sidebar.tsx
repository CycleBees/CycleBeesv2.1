import React from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const sections = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: '📊',
      description: 'Overview & Analytics'
    },
    { 
      id: 'repair', 
      label: 'Repair Management', 
      icon: '🔧',
      description: 'Service Requests & Catalog'
    },
    { 
      id: 'rental', 
      label: 'Rental Management', 
      icon: '🚲',
      description: 'Bicycle Rentals & Inventory'
    },
    { 
      id: 'coupons', 
      label: 'Coupon Management', 
      icon: '🎫',
      description: 'Discount Codes & Offers'
    },
    { 
      id: 'promotional', 
      label: 'Promotional Cards', 
      icon: '📱',
      description: 'Home Page Content'
    },
    { 
      id: 'users', 
      label: 'User Management', 
      icon: '👥',
      description: 'Customer Profiles & Analytics'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.reload();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">🚲</div>
          <div className="brand-text">
            <h2>Cycle-Bees</h2>
            <span>Admin Dashboard</span>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-title">Main Navigation</h3>
          {sections.map((section) => (
            <button
              key={section.id}
              className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => onSectionChange(section.id)}
            >
              <div className="item-icon">{section.icon}</div>
              <div className="item-content">
                <span className="item-label">{section.label}</span>
                <span className="item-description">{section.description}</span>
              </div>
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 