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

  // If text is single-line but contains CASE X, pre-process to add newlines for easier reading
  let processedText = text;
  if (!text.includes("\n") && /case \d+/i.test(text)) {
    processedText = text.replace(/(case \d+)/gi, "\n$1");
  }

  const lines = processedText.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let currentListItems: string[] = [];

  const flushList = (key: string | number) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="revision-bullet-list" style={{ margin: "0.5rem 0 0.75rem 1.5rem", listStyleType: "disc" }}>
          {currentListItems.map((item, idx) => {
            const hasFormula = item.includes(" = ") || item.toLowerCase().includes("speed up =");
            return (
              <li key={idx} style={{ marginBottom: "0.25rem", color: "var(--text-main)", fontSize: "0.95rem" }}>
                {hasFormula ? (
                  <span className="formula-inline">{item}</span>
                ) : (
                  item
                )}
              </li>
            );
          })}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(index);
      return;
    }

    // Check if it's a bullet point
    const bulletMatch = trimmed.match(/^[\-\*\u2022]\s+(.*)$/);
    if (bulletMatch) {
      currentListItems.push(bulletMatch[1]);
      return;
    }

    // Flush any pending list items
    flushList(index);

    // Check if there is a CASE label block
    const caseMatch = trimmed.match(/^(CASE \d+.*?)(?::|-|\s-\s|:-)(.*)$/i);
    if (caseMatch) {
      const caseLabel = caseMatch[1].trim();
      const rest = caseMatch[2].trim();
      const hasFormula = rest.includes(" = ") || rest.toLowerCase().includes("speed up =");

      elements.push(
        <div key={index} className="note-section" style={{ marginBottom: "0.75rem" }}>
          <div style={{ marginBottom: "0.4rem" }}>
            <span className="case-badge">{caseLabel}</span>
          </div>
          {rest && (
            <div className={hasFormula ? "formula-block" : "note-section-text"}>
              {rest}
            </div>
          )}
        </div>
      );
      return;
    }

    // Check if there is a label followed by a formula on the same line (split by colon)
    const colonIndex = trimmed.indexOf(":");
    const equalsIndex = trimmed.indexOf(" = ");
    const speedUpIndex = trimmed.toLowerCase().indexOf("speed up =");
    const activeEqualsIndex = equalsIndex !== -1 ? equalsIndex : speedUpIndex;

    if (colonIndex !== -1 && activeEqualsIndex !== -1 && colonIndex < activeEqualsIndex) {
      const label = trimmed.substring(0, colonIndex + 1).trim();
      const formulaPart = trimmed.substring(colonIndex + 1).trim();
      
      elements.push(
        <div key={index} className="note-section" style={{ marginBottom: "0.75rem" }}>
          <p className="note-section-text" style={{ fontWeight: 600, color: "var(--text-main)" }}>{label}</p>
          <div className="formula-block">
            {formulaPart}
          </div>
        </div>
      );
      return;
    }

    // Check if the entire line is a formula
    const isFormula = trimmed.includes(" = ") || trimmed.toLowerCase().includes("speed up =");
    if (isFormula) {
      elements.push(
        <div key={index} className="formula-block">
          {trimmed}
        </div>
      );
    } else {
      elements.push(
        <p key={index} className="note-section-text">
          {trimmed}
        </p>
      );
    }
  });

  // Flush any final list items
  flushList("final");

  return elements;
}

export default function DailyRevisionNotes({ sessions, onDismiss }: DailyRevisionNotesProps) {
  // Calculate day starts relative to local time
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Filter and group sessions
  const categorizedNotes = {
    0: [] as StudySession[], // Today
    1: [] as StudySession[], // Yesterday
    2: [] as StudySession[], // 2 Days Ago
    3: [] as StudySession[], // 3 Days Ago
    4: [] as StudySession[], // Older
  };

  sessions.forEach((s) => {
    if (!s.notes || s.notes.trim() === "") return;
    
    const diffTime = startOfToday - s.endTime;
    let diffDays = 0;
    
    if (diffTime > 0) {
      diffDays = Math.ceil(diffTime / oneDayMs);
    } else {
      diffDays = 0; // Today
    }

    if (diffDays === 0) {
      categorizedNotes[0].push(s);
    } else if (diffDays === 1) {
      categorizedNotes[1].push(s);
    } else if (diffDays === 2) {
      categorizedNotes[2].push(s);
    } else if (diffDays === 3) {
      categorizedNotes[3].push(s);
    } else {
      categorizedNotes[4].push(s);
    }
  });

  // Initialize activeTab dynamically based on which tab contains notes
  const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3 | 4>(() => {
    if (categorizedNotes[1].length > 0) return 1; // Default to Yesterday if it has entries
    if (categorizedNotes[0].length > 0) return 0;
    if (categorizedNotes[2].length > 0) return 2;
    if (categorizedNotes[3].length > 0) return 3;
    if (categorizedNotes[4].length > 0) return 4;
    return 1; // Fallback to Yesterday
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
            id="btn-tab-today"
            className={`revision-tab-btn ${activeTab === 0 ? "active" : ""}`} 
            onClick={() => setActiveTab(0)}
          >
            <span>Today</span>
            <span className="tab-count-badge">{categorizedNotes[0].length}</span>
          </button>
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
          <button 
            id="btn-tab-older"
            className={`revision-tab-btn ${activeTab === 4 ? "active" : ""}`} 
            onClick={() => setActiveTab(4)}
          >
            <span>Older</span>
            <span className="tab-count-badge">{categorizedNotes[4].length}</span>
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
