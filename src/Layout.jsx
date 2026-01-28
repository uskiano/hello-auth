import React from 'react'

function NavItem({ active, children, href = '#', icon }) {
  return (
    <a
      className={`navItem ${active ? 'active' : ''}`}
      href={href}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <span className="navIcon">{icon}</span>
      <span>{children}</span>
    </a>
  )
}

export default function Layout({ title = 'Dashboard', children }) {
  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <div className="brand">
            <div className="brandMark">J</div>
            <div>
              <div className="brandName">Juan</div>
              <div className="brandSub">Virtual Company</div>
            </div>
          </div>
        </div>

        <div className="navSection">Dashboards</div>
        <nav className="nav">
          <NavItem
            active
            href="/dashboard"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9 7v-10h7v10h-7Z" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            }
          >
            Project Management
          </NavItem>
          <NavItem
            href="#"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6V4m0 16v-2M6 12H4m16 0h-2M7.6 7.6 6.2 6.2m11.6 11.6-1.4-1.4M16.4 7.6l1.4-1.4M6.2 17.8l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6"/>
              </svg>
            }
          >
            Settings
          </NavItem>
        </nav>

        <div className="sidebarBottom muted">v0.1</div>
      </aside>

      <main className="main">
        <div className="pageHeader">
          <div>
            <div className="pageTitle">{title}</div>
            <div className="breadcrumbs muted">Super Admin <span className="crumbSep">›</span> Dashboards</div>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}
