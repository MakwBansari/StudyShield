"use client";

import React, { useState } from "react";
import { StorageAPI } from "@/lib/storage";
import { Settings } from "@/lib/types";

interface ProfileViewProps {
  user: { name?: string; email?: string };
  settings: Settings;
  onUpdate: () => void;
}

export default function ProfileView({ user, settings, onUpdate }: ProfileViewProps) {
  const [whitelist, setWhitelist] = useState((settings.whitelist || []).join("\n"));
  const [blacklist, setBlacklist] = useState((settings.blacklist || []).join("\n"));

  const [exportRange, setExportRange] = useState("weekly");
  const [exportSubject, setExportSubject] = useState("All");

  const handleSave = () => {
    StorageAPI.saveSettings({
      whitelist: whitelist.split("\n").map(s => s.trim()).filter(s => s !== ""),
      blacklist: blacklist.split("\n").map(s => s.trim()).filter(s => s !== ""),
    });
    alert("Profile settings updated!");
    onUpdate();
  };

  const handleExport = () => {
    const sessions = StorageAPI.getSessions();
    if (!sessions || sessions.length === 0) {
      alert("No logged study sessions available to export.");
      return;
    }

    const now = new Date();
    const filterByDate = (days: number) => {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - days);
      return sessions.filter(s => new Date(s.date) >= cutoff);
    };

    let filtered = sessions;

    // Filter by Date Range
    if (exportRange === "daily") {
      const todayStr = now.toISOString().split("T")[0];
      filtered = sessions.filter(s => s.date === todayStr);
    } else if (exportRange === "weekly") {
      filtered = filterByDate(7);
    } else if (exportRange === "monthly") {
      filtered = filterByDate(30);
    } else if (exportRange === "3months") {
      filtered = filterByDate(90);
    }

    // Filter by Subject
    if (exportSubject !== "All") {
      filtered = filtered.filter(s => s.subject === exportSubject);
    }

    if (filtered.length === 0) {
      alert("No sessions match the selected filter criteria.");
      return;
    }

    // CSV Generation
    const headers = ["Date", "Subject", "Activity", "Topic", "Duration (mins)", "Questions Solved", "Unsolved Questions", "Source", "Doubts"];
    const csvRows = filtered.map(s => [
      s.date,
      `"${s.subject}"`,
      `"${s.activity}"`,
      `"${s.topic || ""}"`,
      s.durationMinutes,
      s.questionsSolved || 0,
      s.unsolvedQuestions || 0,
      `"${s.source || "General Study"}"`,
      `"${s.unsolvedDoubts || ""}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `StudyShield_Report_${exportRange}_${exportSubject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (confirm("Are you SURE you want to delete all study data?")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const subjects = Array.from(new Set(StorageAPI.getSessions().map(s => s.subject)));

  return (
    <div className="card profile-card">
      <h2>Your Profile</h2>
      <div className="profile-info">
        <div className="info-group">
          <label>Name</label>
          <div className="info-val">{user.name || "N/A"}</div>
        </div>
        <div className="info-group">
          <label>Email</label>
          <div className="info-val">{user.email || "N/A"}</div>
        </div>
      </div>

      <div className="focus-settings">
        <h3>Export Study Reports (.CSV)</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Generate customized performance CSV logs to audit your routines.
        </p>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="info-group" style={{ flex: 1 }}>
            <label>Time Period</label>
            <select className="input" value={exportRange} onChange={(e) => setExportRange(e.target.value)}>
              <option value="all">All-Time</option>
              <option value="daily">Daily (Today)</option>
              <option value="weekly">Weekly (Last 7 Days)</option>
              <option value="monthly">Monthly (Last 30 Days)</option>
              <option value="3months">Quarterly (3 Months)</option>
            </select>
          </div>

          <div className="info-group" style={{ flex: 1 }}>
            <label>Subject</label>
            <select className="input" value={exportSubject} onChange={(e) => setExportSubject(e.target.value)}>
              <option value="All">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button onClick={handleExport} className="btn btn-primary" style={{ width: "100%" }}>
          📥 Export CSV Data
        </button>
      </div>

      <div className="focus-settings" style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid var(--border)" }}>
        <h3>Focus Settings</h3>
        
        <div className="info-group">
          <label>Whitelist (One per line)</label>
          <textarea 
            className="input" 
            style={{ height: "100px" }}
            value={whitelist}
            onChange={(e) => setWhitelist(e.target.value)}
          ></textarea>
        </div>

        <div className="info-group">
          <label>Blacklist (One per line)</label>
          <textarea 
            className="input" 
            style={{ height: "100px" }}
            value={blacklist}
            onChange={(e) => setBlacklist(e.target.value)}
          ></textarea>
        </div>

        <button onClick={handleSave} className="btn btn-primary">Update Focus Settings</button>
      </div>
      
      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <button onClick={handleReset} className="btn btn-danger">Reset All Study Data</button>
      </div>

      <style jsx>{`
        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin: 1.5rem 0;
        }
        .info-group label {
          display: block;
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }
        .info-val {
          font-size: 1.2rem;
          font-weight: 500;
        }
        .focus-settings {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
        }
        .focus-settings h3 {
          margin-bottom: 1.5rem;
        }
        .danger-zone {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }
        .danger-zone h3 {
          color: var(--danger);
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
