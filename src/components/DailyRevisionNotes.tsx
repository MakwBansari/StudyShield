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
      <div className="notebook-container">
        {/* Spiral Binder */}
        <div className="spiral-binder">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="spiral-ring-pair">
              <div className="spiral-hole page-hole"></div>
              <div className="spiral-ring"></div>
            </div>
          ))}
        </div>

        {/* Bookmark Tabs sticking out to the right */}
        <div className="sticky-tabs">
          <button 
            className={`sticky-tab tab-yesterday ${activeTab === 1 ? "active" : ""}`} 
            onClick={() => setActiveTab(1)}
          >
            <span className="tab-label">Yesterday</span>
            <span className="tab-count">({categorizedNotes[1].length})</span>
          </button>
          <button 
            className={`sticky-tab tab-2days ${activeTab === 2 ? "active" : ""}`} 
            onClick={() => setActiveTab(2)}
          >
            <span className="tab-label">2 Days Ago</span>
            <span className="tab-count">({categorizedNotes[2].length})</span>
          </button>
          <button 
            className={`sticky-tab tab-3days ${activeTab === 3 ? "active" : ""}`} 
            onClick={() => setActiveTab(3)}
          >
            <span className="tab-label">3 Days Ago</span>
            <span className="tab-count">({categorizedNotes[3].length})</span>
          </button>
        </div>

        {/* Main Notebook Page */}
        <div className="notebook-page">
          <div className="notebook-header">
            <div className="journal-badge">📝 STUDY JOURNAL</div>
            <h2>Revision Log</h2>
            <p className="subtitle">Lapse: 3 days spaced repetition recall</p>
          </div>

          <div className="notebook-content-scroll">
            <div className="lined-paper">
              {activeNotes.length > 0 ? (
                <div className="notes-list">
                  {activeNotes.map((note) => (
                    <div key={note.id} className="lined-note-card">
                      <div className="note-card-meta">
                        <span className="handwritten-subject"># {note.subject}</span>
                        <span className="note-duration">({note.activity} • {note.durationMinutes}m)</span>
                      </div>
                      {note.topic && (
                        <div className="handwritten-topic">
                          Topic: <u>{note.topic}</u>
                        </div>
                      )}
                      <div className="handwritten-body">
                        {note.notes}
                      </div>
                      <div className="note-divider"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-paper-state">
                  <span className="empty-emoji">🍃</span>
                  <h3>No entries found</h3>
                  <p>No revision summaries were logged for this day.</p>
                </div>
              )}
            </div>
          </div>

          <div className="notebook-footer">
            <button className="btn-notebook-done" onClick={onDismiss}>
              Close Journal & Mark as Revised
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&family=Outfit:wght@400;600;700&display=swap');

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

        .notebook-container {
          position: relative;
          background: #1e293b; /* Premium Dark Navy leather binder cover */
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 
                      inset 5px 0 10px rgba(0, 0, 0, 0.5);
          border-radius: 12px 24px 24px 12px;
          max-width: 650px;
          width: 100%;
          display: flex;
          flex-direction: column;
          height: 85vh;
          max-height: 720px;
          padding: 10px 10px 10px 32px; /* Margin for spiral binding on the left */
          margin-right: 100px; /* Space for the tabs sticking out on desktop */
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* Spiral Ring Binder Styling */
        .spiral-binder {
          position: absolute;
          left: 12px;
          top: 30px;
          bottom: 30px;
          width: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
          pointer-events: none;
        }

        .spiral-ring-pair {
          position: relative;
          width: 100%;
          height: 20px;
        }

        .spiral-hole {
          width: 8px;
          height: 12px;
          background: #0f172a;
          border-radius: 4px;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.8);
          position: absolute;
          top: 4px;
        }

        .page-hole {
          left: 14px; /* Placed exactly on the paper crease */
        }

        .spiral-ring {
          position: absolute;
          left: -6px;
          top: -2px;
          width: 28px;
          height: 20px;
          border: 3.5px solid transparent;
          border-top-color: #cbd5e1;
          border-left-color: #94a3b8;
          border-right-color: #cbd5e1;
          border-bottom-color: transparent;
          border-radius: 50% 50% 40% 40%;
          transform: rotate(-12deg);
          filter: drop-shadow(2px 3px 2px rgba(0,0,0,0.4));
          z-index: 105;
        }

        /* Notebook Page cream style */
        .notebook-page {
          background: #fdfbf7;
          border-radius: 4px 16px 16px 4px;
          box-shadow: inset 2px 0 5px rgba(0,0,0,0.1), 3px 3px 10px rgba(0,0,0,0.2);
          border-left: 1px solid rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .notebook-header {
          padding: 1.5rem 1.5rem 1rem 4.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: #fdfbf7;
        }

        .journal-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #b45309;
          background: #fef3c7;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 0.5rem;
        }

        .notebook-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.15rem 0;
        }

        .subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        .notebook-content-scroll {
          flex: 1;
          overflow-y: auto;
          background: #fdfbf7;
        }

        /* Ruled notebook lined paper */
        .lined-paper {
          background-color: #fdfbf7;
          background-image: 
            linear-gradient(90deg, transparent 59px, #fca5a5 59px, #fca5a5 61px, transparent 61px),
            linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px);
          background-size: 100% 100%, 100% 2.2rem;
          padding: 1.5rem 1.5rem 1.5rem 4.5rem;
          min-height: 100%;
        }

        .notes-list {
          display: flex;
          flex-direction: column;
        }

        .lined-note-card {
          margin-bottom: 1.5rem;
        }

        .note-card-meta {
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          color: #475569;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .handwritten-subject {
          font-family: 'Caveat', cursive, sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #0284c7; /* Dark blue ink */
        }

        .note-duration {
          font-size: 0.75rem;
          background: rgba(0, 0, 0, 0.04);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .handwritten-topic {
          font-family: 'Caveat', cursive, sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .handwritten-body {
          font-family: 'Patrick Hand', cursive, sans-serif;
          font-size: 1.3rem;
          line-height: 2.2rem; /* Aligns with notebook grid lines */
          color: #1e293b; /* Pen blue/black */
          white-space: pre-wrap;
          word-break: break-word;
          transform: rotate(-0.5deg); /* Handwritten tilt */
        }

        .note-divider {
          border-bottom: 1.5px dashed rgba(0, 0, 0, 0.12);
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          width: 95%;
        }

        .empty-paper-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1rem;
          color: #64748b;
          text-align: center;
        }

        .empty-emoji {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-paper-state h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #334155;
        }

        .empty-paper-state p {
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          margin: 0;
        }

        /* Sticky Bookmark Tabs on Desktop */
        .sticky-tabs {
          position: absolute;
          right: -100px;
          top: 60px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 50;
        }

        .sticky-tab {
          width: 108px;
          border: none;
          border-radius: 0 12px 12px 0;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 8px 8px 8px 14px;
          color: white;
          font-family: 'Outfit', sans-serif;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 4px 3px 8px rgba(0, 0, 0, 0.3);
          transform-origin: left center;
        }

        .tab-label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .tab-count {
          font-size: 0.7rem;
          opacity: 0.85;
          margin-top: 1px;
        }

        /* Color palettes for index tabs */
        .tab-yesterday {
          background: #d97706; /* Amber */
          border-left: 3px solid #b45309;
        }
        .tab-yesterday:hover {
          background: #f59e0b;
        }

        .tab-2days {
          background: #0d9488; /* Teal */
          border-left: 3px solid #0f766e;
        }
        .tab-2days:hover {
          background: #14b8a6;
        }

        .tab-3days {
          background: #7c3aed; /* Violet */
          border-left: 3px solid #6d28d9;
        }
        .tab-3days:hover {
          background: #8b5cf6;
        }

        .sticky-tab.active {
          width: 120px;
          transform: scale(1.05);
          box-shadow: 6px 4px 12px rgba(0, 0, 0, 0.4);
          font-weight: 700;
        }

        /* Footer */
        .notebook-footer {
          padding: 1rem 1.5rem 1.5rem 4.5rem;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          background: #fdfbf7;
        }

        .btn-notebook-done {
          width: 100%;
          background: #0f172a; /* Ink black button */
          color: white;
          border: none;
          padding: 0.85rem;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
        }

        .btn-notebook-done:hover {
          background: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
        }

        .btn-notebook-done:active {
          transform: translateY(0);
        }

        /* Responsiveness for Mobile Viewports */
        @media (max-width: 768px) {
          .notebook-container {
            padding: 8px 8px 8px 24px;
            margin-right: 0;
            height: 90vh;
          }

          .spiral-binder {
            left: 6px;
          }

          .spiral-ring {
            width: 24px;
            height: 18px;
          }

          .page-hole {
            left: 10px;
          }

          .notebook-header {
            padding: 1.25rem 1rem 0.75rem 3rem;
          }

          .lined-paper {
            padding: 1.25rem 1rem 1.25rem 3rem;
            background-image: 
              linear-gradient(90deg, transparent 44px, #fca5a5 44px, #fca5a5 46px, transparent 46px),
              linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px);
          }

          .notebook-footer {
            padding: 0.75rem 1rem 1.25rem 3rem;
          }

          .sticky-tabs {
            position: relative;
            right: 0;
            top: 0;
            flex-direction: row;
            width: 100%;
            justify-content: space-around;
            margin-bottom: 0.5rem;
            gap: 4px;
          }

          .sticky-tab {
            width: auto;
            flex: 1;
            border-radius: 8px 8px 0 0;
            padding: 6px 4px;
            align-items: center;
            border-left: none;
            box-shadow: 2px -2px 6px rgba(0, 0, 0, 0.15);
            height: auto;
          }

          .sticky-tab.active {
            width: auto;
            transform: scaleY(1.05) translateY(-2px);
          }

          .tab-yesterday {
            border-top: 3px solid #b45309;
          }

          .tab-2days {
            border-top: 3px solid #0f766e;
          }

          .tab-3days {
            border-top: 3px solid #6d28d9;
          }
        }
      `}</style>
    </div>
  );
}
