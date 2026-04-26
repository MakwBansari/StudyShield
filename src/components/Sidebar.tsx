"use client";

import React from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  examDate?: string;
  whitelist?: string[];
}

export default function Sidebar({ activeTab, setActiveTab, examDate, whitelist }: SidebarProps) {
  const calculateDaysToGATE = () => {
    if (!examDate) return "--";
    const diff = new Date(examDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <aside className="sidebar">
      <div className="logo">StudyShield<span>.</span></div>
      
      <div className="countdown-widget">
        <div className="countdown-value">{calculateDaysToGATE()}</div>
        <div className="countdown-label">Days to GATE</div>
        <div className="countdown-pace">Pace: 0% covered</div>
        <button className="btn btn-small">Set Exam Date</button>
      </div>

      <nav className="main-nav">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "stats", label: "Statistics" },
          { id: "mock", label: "Mock Tests" },
          { id: "goals", label: "Study Goals" },
          { id: "ai", label: "AI Planner" },
          { id: "profile", label: "Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="whitelist-panel">
        <h3>Quick Whitelist</h3>
        <ul>
          {whitelist && whitelist.length > 0 ? (
            whitelist.slice(0, 10).map((site, i) => <li key={i} title={site}>{site}</li>)
          ) : (
            <li>No websites whitelisted</li>
          )}
        </ul>
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px;
          background-color: var(--bg-card);
          border-right: 1px solid var(--border);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
          z-index: 10;
          height: 100vh;
          position: sticky;
          top: 0;
        }

        .countdown-widget {
          background-color: var(--bg-card-hover);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.2rem;
          text-align: center;
        }

        .countdown-value {
          font-family: var(--font-mono);
          font-size: 2rem;
          color: var(--accent);
          font-weight: 700;
        }

        .countdown-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .countdown-pace {
          font-size: 0.85rem;
          margin-bottom: 1rem;
          color: var(--text-muted);
        }

        .main-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-btn {
          background: transparent;
          color: var(--text-muted);
          border: none;
          text-align: left;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .nav-btn:hover {
          background-color: var(--bg-card-hover);
          color: var(--text-main);
        }

        .nav-btn.active {
          background-color: var(--accent);
          color: #fff;
        }

        .whitelist-panel {
          margin-top: auto;
          font-size: 0.8rem;
        }

        .whitelist-panel h3 {
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          font-size: 0.75rem;
        }

        .whitelist-panel ul {
          list-style-type: none;
          color: var(--text-muted);
        }

        .whitelist-panel li {
          margin-bottom: 0.4rem;
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
      `}</style>
    </aside>
  );
}
