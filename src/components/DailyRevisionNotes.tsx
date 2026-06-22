"use client";

import React, { useState } from "react";
import { StudySession } from "@/lib/types";

interface DailyRevisionNotesProps {
  sessions: StudySession[];
  onDismiss: () => void;
}

export default function DailyRevisionNotes({ sessions, onDismiss }: DailyRevisionNotesProps) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1); // 1 = Yesterday, 2 = 2 Days Ago, 3 = 3 Days Ago

  // Calculate day starts relative to local time
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Filter and group sessions
  const categorizedNotes = {
    1: [] as StudySession[], // Yesterday
    2: [] as StudySession[], // 2 Days Ago
    3: [] as StudySession[], // 3 Days Ago
  };

  sessions.forEach((s) => {
    if (!s.notes || s.notes.trim() === "") return;
    
    const diffTime = startOfToday - s.endTime;
    const diffDays = Math.ceil(diffTime / oneDayMs);

    if (diffDays === 1) {
      categorizedNotes[1].push(s);
    } else if (diffDays === 2) {
      categorizedNotes[2].push(s);
    } else if (diffDays === 3) {
      categorizedNotes[3].push(s);
    }
  });

  const activeNotes = categorizedNotes[activeTab];

  return (
    <div className="revision-overlay animate-fade-in">
      <div className="revision-modal">
        <div className="modal-header">
          <div className="title-icon">🧠</div>
          <div>
            <h2>Daily Revision Notes</h2>
            <p className="subtitle">Revise your short summaries from the last 3 days to keep them fresh in memory.</p>
          </div>
        </div>

        {/* Day selection tabs */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 1 ? "active" : ""}`} 
            onClick={() => setActiveTab(1)}
          >
            Yesterday ({categorizedNotes[1].length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 2 ? "active" : ""}`} 
            onClick={() => setActiveTab(2)}
          >
            2 Days Ago ({categorizedNotes[2].length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 3 ? "active" : ""}`} 
            onClick={() => setActiveTab(3)}
          >
            3 Days Ago ({categorizedNotes[3].length})
          </button>
        </div>

        {/* Notes display area */}
        <div className="notes-content-container">
          {activeNotes.length > 0 ? (
            <div className="notes-list">
              {activeNotes.map((note) => (
                <div key={note.id} className="note-card">
                  <div className="note-card-header">
                    <span className="note-subject-badge">{note.subject}</span>
                    <span className="note-meta">{note.activity} • {note.durationMinutes}m</span>
                  </div>
                  {note.topic && <h4 className="note-topic-title">Topic: {note.topic}</h4>}
                  <div className="note-text-body">
                    {note.notes}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🍃</span>
              <p>No revision notes logged on this day.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary full-width" onClick={onDismiss}>
            ✅ I have revised today's notes
          </button>
        </div>
      </div>

      <style jsx>{`
        .revision-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 12, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .revision-modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border-radius: 24px;
          max-width: 650px;
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 80vh;
          overflow: hidden;
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          padding: 2rem;
          display: flex;
          gap: 1.25rem;
          border-bottom: 1px solid var(--border);
        }

        .title-icon {
          font-size: 2.5rem;
          display: flex;
          align-items: center;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 0.25rem 0;
        }

        .subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin: 0;
        }

        .tabs-container {
          display: flex;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
        }

        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 1rem;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }

        .tab-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.01);
        }

        .tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          background: rgba(245, 166, 35, 0.04);
        }

        .notes-content-container {
          padding: 2rem;
          overflow-y: auto;
          flex: 1;
          min-height: 250px;
        }

        .notes-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .note-card {
          background: var(--bg-card-hover);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .note-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .note-subject-badge {
          background: rgba(245, 166, 35, 0.15);
          color: var(--accent);
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .note-meta {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .note-topic-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
          color: var(--text-main);
        }

        .note-text-body {
          font-size: 0.95rem;
          color: var(--text-main);
          white-space: pre-wrap;
          line-height: 1.5;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          border-left: 3px solid var(--accent);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 0;
          color: var(--text-muted);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .modal-footer {
          padding: 1.5rem 2rem;
          border-top: 1px solid var(--border);
        }

        .full-width {
          width: 100%;
          padding: 1rem;
          font-size: 1.05rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
