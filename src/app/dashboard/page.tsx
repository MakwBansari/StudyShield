"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardView from "@/components/DashboardView";
import GoalsView from "@/components/GoalsView";
import StatsView from "@/components/StatsView";
import MockView from "@/components/MockView";
import AIView from "@/components/AIView";
import ProfileView from "@/components/ProfileView";
import MindMapView from "@/components/MindMapView";
import MistakeLogView from "@/components/MistakeLogView";
import { StorageAPI } from "@/lib/storage";
import { Settings, StudySession } from "@/lib/types";

import MorningBriefing from "@/components/MorningBriefing";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [showBriefing, setShowBriefing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
    const currentSettings = StorageAPI.getSettings();
    setSettings(currentSettings);
    setSessions(StorageAPI.getSessions());
    setTests(StorageAPI.getMockTests());

    // Check for daily briefing
    const today = new Date().toISOString().split("T")[0];
    if (currentSettings.lastBriefingDate !== today) {
      setShowBriefing(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    router.push("/");
  };

  const handleDismissBriefing = (action: "revise" | "study") => {
    const today = new Date().toISOString().split("T")[0];
    StorageAPI.saveSettings({ lastBriefingDate: today });
    setSettings({ ...settings, lastBriefingDate: today });
    setShowBriefing(false);
    
    if (action === "revise") {
      setActiveTab("mindmap"); // Route to mind map for revision
    }
  };

  const handleUpdateExamDate = (newDate: string) => {
    StorageAPI.saveSettings({ examDate: newDate });
    setSettings(prev => ({ ...prev, examDate: newDate }));
  };

  const activeSubject = settings.goals?.find(g => g.isActive)?.subject;

  if (!user) return null;

  return (
    <div className="app-container">
      {showBriefing && (
        <MorningBriefing 
          settings={settings} 
          onDismiss={handleDismissBriefing}
          activeSubject={activeSubject}
          examDate={settings.examDate}
        />
      )}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        examDate={settings.examDate}
        whitelist={settings.whitelist}
        onUpdateExamDate={handleUpdateExamDate}
      />

      <main className="main-content">
        <header className="top-nav">
          <h2 id="page-title">
            {activeTab === "stats" && "Statistics"}
            {activeTab === "dashboard" && "Dashboard"}
            {activeTab === "mock" && "Mock Tests"}
            {activeTab === "goals" && "Study Goals"}
            {activeTab === "ai" && "AI Planner"}
            {activeTab === "profile" && "Profile"}
            {activeTab === "mindmap" && "Syllabus Mind Map"}
          </h2>
          <div className="user-controls">
            <span id="user-name-display">{(user.name && user.name !== "N/A") ? user.name : (user.email || "User")}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-small">Log Out</button>
          </div>
        </header>

        <div className="tab-content">
          {activeTab === "dashboard" && <DashboardView sessions={sessions} settings={settings} userName={user.name} />}
          {activeTab === "stats" && <StatsView sessions={sessions} settings={settings} />}
          {activeTab === "mock" && (
            <MockView 
              tests={tests} 
              onUpdate={() => {
                setTests(StorageAPI.getMockTests());
              }} 
            />
          )}
          {activeTab === "goals" && (
            <GoalsView 
              settings={settings} 
              onUpdate={() => {
                setSettings(StorageAPI.getSettings());
                setSessions(StorageAPI.getSessions());
              }} 
            />
          )}
          {activeTab === "ai" && <AIView sessions={sessions} settings={settings} />}
          {activeTab === "mindmap" && <MindMapView settings={settings} onUpdate={() => {
                setSettings(StorageAPI.getSettings());
              }} />}
          {activeTab === "mistakes" && <MistakeLogView />}
          {activeTab === "profile" && (
    <ProfileView 
              user={user} 
              settings={settings} 
              onUpdate={() => {
                setSettings(StorageAPI.getSettings());
                const storedUser = localStorage.getItem("user");
                if (storedUser) setUser(JSON.parse(storedUser));
              }} 
            />
          )}
        </div>
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-color);
        }

        .main-content {
          flex: 1;
          padding: 2.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 2rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        #page-title {
          font-size: 3.5rem;
          font-weight: 800;
          letter-spacing: -2px;
          background: linear-gradient(135deg, var(--text-main) 30%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .user-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        #user-name-display {
          font-weight: 500;
          color: var(--text-muted);
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
