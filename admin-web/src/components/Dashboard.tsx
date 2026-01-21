import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Overview from './sections/Overview';
import UserManagement from './sections/UserManagement';
import JobOversight from './sections/JobOversight';
import PaymentMonitoring from './sections/PaymentMonitoring';
import DisputeResolution from './sections/DisputeResolution';
import ContentModeration from './sections/ContentModeration';
import Analytics from './sections/Analytics';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-chart-line', path: '/' },
    { id: 'users', label: 'User Management', icon: 'fas fa-users', path: '/users' },
    { id: 'jobs', label: 'Job Oversight', icon: 'fas fa-briefcase', path: '/jobs' },
    { id: 'payments', label: 'Payment Monitoring', icon: 'fas fa-credit-card', path: '/payments' },
    { id: 'disputes', label: 'Dispute Resolution', icon: 'fas fa-gavel', path: '/disputes' },
    { id: 'moderation', label: 'Content Moderation', icon: 'fas fa-shield-alt', path: '/moderation' },
    { id: 'analytics', label: 'Analytics', icon: 'fas fa-chart-bar', path: '/analytics' },
  ];

  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = menuItems.find(item => item.path === currentPath);
    if (currentItem) {
      setActiveSection(currentItem.id);
    }
  }, [location.pathname, menuItems]);

  const handleMenuClick = (item: typeof menuItems[0]) => {
    setActiveSection(item.id);
    navigate(item.path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.id === activeSection);
    return currentItem?.label || 'Dashboard';
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-circle">
              <i className="fas fa-hammer"></i>
            </div>
            <div className="logo-text">
              <h3>Handwork</h3>
              <span>Admin Panel</span>
            </div>
          </div>
        </div>
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li
              key={item.id}
              className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="admin-info">
            <i className="fas fa-user-shield"></i>
            <span>{user?.first_name} {user?.last_name}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <h1>{getPageTitle()}</h1>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => window.location.reload()}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/jobs" element={<JobOversight />} />
          <Route path="/payments" element={<PaymentMonitoring />} />
          <Route path="/disputes" element={<DisputeResolution />} />
          <Route path="/moderation" element={<ContentModeration />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
};

export default Dashboard;