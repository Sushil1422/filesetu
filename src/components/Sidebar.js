// src/components/Sidebar.js
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  FileText,
  Upload,
  FolderOpen,
  BookOpen,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "../styles/Sidebar.css";

const Sidebar = ({
  userRole,
  userName,
  currentUser,
  activeTab,
  setActiveTab,
  onLogoutClick,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Auto-collapse on mobile
      if (mobile) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      } else {
        setSidebarCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const getMenuItems = () => {
    const baseItems = [
      {
        id: "overview",
        label: "Overview",
        icon: <LayoutDashboard size={20} />,
        emoji: "📊",
      },
      {
        id: "files",
        label: "File Uploads",
        icon: <Upload size={20} />,
        emoji: "📤",
      },
      {
        id: "RecordsView",
        label: "File Records",
        icon: <FileText size={20} />,
        emoji: "📋",
      },
    ];

    if (userRole === "admin") {
      return [
        ...baseItems,
        {
          id: "portfolio",
          label: "My Files",
          icon: <FolderOpen size={20} />,
          emoji: "💼",
        },
        {
          id: "dairy",
          label: "Daily Dairy",
          icon: <BookOpen size={20} />,
          emoji: "📔",
        },
        {
          id: "logbook",
          label: "Log Book",
          icon: <Calendar size={20} />,
          emoji: "📖",
        },
        {
          id: "users",
          label: "User Management",
          icon: <Users size={20} />,
          emoji: "👥",
        },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleMenuClick = (itemId) => {
    setActiveTab(itemId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && mobileMenuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${
          isMobile && mobileMenuOpen ? "mobile-open" : ""
        }`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="logo">
            <LayoutDashboard className="logo-icon" size={isMobile ? 24 : 28} />
            {!sidebarCollapsed && (
              <div className="logo-text-wrapper">
                <span className="logo-text">
                  {userRole === "admin" ? "Admin Panel" : "User Panel"}
                </span>
                <span className="logo-subtitle">Dashboard</span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          {!isMobile && (
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {sidebarCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
          )}
        </div>

        {/* User Profile Card */}
        <div className="user-profile-card">
          <div className="profile-avatar">
            {currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="profile-info">
              <span className="profile-name">
                {userName || currentUser?.email?.split("@")[0]}
              </span>
              <span className="profile-role">
                {userRole === "admin" ? "👑 Administrator" : "👤 Sub Admin"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!sidebarCollapsed && (
              <span className="nav-section-title">MENU</span>
            )}
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? "active" : ""} ${
                  item.id === "dairy" || item.id === "logbook"
                    ? "special-item"
                    : ""
                }`}
                onClick={() => handleMenuClick(item.id)}
                title={sidebarCollapsed ? item.label : ""}
                aria-label={item.label}
              >
                <span className="nav-icon">
                  {isMobile || sidebarCollapsed ? item.emoji : item.icon}
                </span>
                {!sidebarCollapsed && (
                  <span className="nav-label">{item.label}</span>
                )}
                {activeTab === item.id && (
                  <span className="active-indicator"></span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            onClick={onLogoutClick}
            className="logout-button"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={20} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
