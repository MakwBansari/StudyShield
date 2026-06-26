"use client";

import React, { useState } from "react";
import { StudySession } from "@/lib/types";

interface DailyRevisionNotesProps {
  sessions: StudySession[];
  onDismiss: () => void;
}

// Helper to format text notes, highlight cases and formulas nicely
function formatNoteContent(text: string) {
  if (!text) return null;

  // Split the notes by "CASE X" markers to separate them into distinct sections
  const parts = text.split(/(?=CASE \d+)/i);

  return parts.map((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return null;

    // Search for "Speed up =" or general equations containing "=" with spaces to format as formula blocks
    const speedUpIndex = trimmed.toLowerCase().indexOf("speed up =");
    const equalsIndex = speedUpIndex !== -1 ? speedUpIndex : trimmed.indexOf(" = ");

    let headerText = "";
    let contentText = trimmed;

    if (equalsIndex !== -1) {
      headerText = trimmed.substring(0, equalsIndex).trim();
      contentText = trimmed.substring(equalsIndex).trim();
    }

    // Clean up trailing punctuation from header text (like dashes, colons)
    const cleanedHeader = headerText.replace(/[:\-\s\u2013\u2014]+$/, "").trim();

    // Check if header represents a CASE block
    const isCase = cleanedHeader.toLowerCase().startsWith("case ");

    return (
      <div key={index} className="note-section" style={{ marginBottom: "1rem" }}>
        {cleanedHeader && (
          <div className="note-section-heading" style={{ marginBottom: "0.5rem" }}>
            {isCase ? (
              <span className="case-badge">{cleanedHeader}</span>
            ) : (
              <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>{cleanedHeader}</strong>
            )}
          </div>
        )}
        
        {contentText && (
          <div className={contentText.includes("=") ? "formula-block" : "note-section-text"}>
            {contentText}
          </div>
        )}
      </div>
    );
  });
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
    
    // Safety check: only allow Theory, Notes, and Mock Test in the notebook
    const act = s.activity || "";
    if (act !== "Theory" && act !== "Notes" && act !== "Mock Test") return;
    
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
    <div className="revision-overlay" id="revision-journal-overlay">
      <div className="revision-modal" id="revision-journal-modal">
        {/* Header */}
        <div className="revision-header">
          <div className="revision-badge">
            <span>📝</span> STUDY JOURNAL
          </div>
          <h2>Revision Log</h2>
          <p className="revision-subtitle">Lapse: 3 days spaced repetition recall</p>
        </div>

        {/* Tab Selectors */}
        <div className="revision-tabs">
          <button 
            id="btn-tab-yesterday"
            className={`revision-tab-btn ${activeTab === 1 ? "active" : ""}`} 
            onClick={() => setActiveTab(1)}
          >
            <span>Yesterday</span>
            <span className="tab-count-badge">{categorizedNotes[1].length}</span>
          </button>
          <button 
            id="btn-tab-2days"
            className={`revision-tab-btn ${activeTab === 2 ? "active" : ""}`} 
            onClick={() => setActiveTab(2)}
          >
            <span>2 Days Ago</span>
            <span className="tab-count-badge">{categorizedNotes[2].length}</span>
          </button>
          <button 
            id="btn-tab-3days"
            className={`revision-tab-btn ${activeTab === 3 ? "active" : ""}`} 
            onClick={() => setActiveTab(3)}
          >
            <span>3 Days Ago</span>
            <span className="tab-count-badge">{categorizedNotes[3].length}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="revision-content-scroll">
          {activeNotes.length > 0 ? (
            <div className="revision-cards-list">
              {activeNotes.map((note) => (
                <div key={note.id} className="revision-note-card">
                  <div className="revision-note-meta">
                    <span className="revision-note-subject"># {note.subject}</span>
                    <span className="revision-note-duration">{note.activity} • {note.durationMinutes}m</span>
                  </div>
                  {note.topic && (
                    <div className="revision-note-topic">
                      <span>Topic:</span> <u>{note.topic}</u>
                    </div>
                  )}
                  <div className="revision-note-body">
                    {formatNoteContent(note.notes)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="revision-empty-state">
              <span className="revision-empty-icon">🍃</span>
              <h3>No entries found</h3>
              <p>No revision summaries were logged for this day.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="revision-footer">
          <button 
            id="btn-close-journal"
            className="btn-revision-done" 
            onClick={onDismiss}
          >
            Close Journal & Mark as Revised
          </button>
        </div>
      </div>
    </div>
  );
}
