"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StorageAPI } from "@/lib/storage";
import { StudySession } from "@/lib/types";

export default function TimerCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subject, setSubject] = useState("");
  const [activity, setActivity] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(0);

  const [questionsSolved, setQuestionsSolved] = useState(0);
  const [unsolvedQuestions, setUnsolvedQuestions] = useState(0);
  const [source, setSource] = useState("General Study");
  const [unsolvedDoubts, setUnsolvedDoubts] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setSubject(searchParams.get("subject") || "General Aptitude");
    setActivity(searchParams.get("activity") || "Theory");
    setTopic(searchParams.get("topic") || "");
    setDuration(parseInt(searchParams.get("duration") || "0", 10));
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const session: StudySession = {
      id: crypto.randomUUID(),
      subject,
      activity,
      topic: topic || notes,
      startTime: Date.now() - duration * 60 * 1000,
      endTime: Date.now(),
      durationMinutes: duration,
      date: new Date().toISOString().split("T")[0],
      questionsSolved,
      unsolvedQuestions,
      source,
      unsolvedDoubts: unsolvedDoubts || undefined,
    };

    StorageAPI.saveSession(session);
    alert("Study session logged successfully!");
    router.push("/dashboard");
  };

  return (
    <div className="fullscreen-complete-container">
      <form onSubmit={handleSubmit} className="complete-card animate-fade-in">
        <h2>Session Completed! 🎉</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          You studied <strong>{subject}</strong> ({activity}) for <strong>{duration} mins</strong>. Let's log your performance.
        </p>

        <div className="form-group">
          <label>Questions SOLVED correctly</label>
          <input 
            type="number" 
            className="input" 
            min="0"
            value={questionsSolved} 
            onChange={(e) => setQuestionsSolved(parseInt(e.target.value) || 0)} 
          />
        </div>

        <div className="form-group">
          <label>Questions UNSOLVED / INCORRECT</label>
          <input 
            type="number" 
            className="input" 
            min="0"
            value={unsolvedQuestions} 
            onChange={(e) => setUnsolvedQuestions(parseInt(e.target.value) || 0)} 
          />
        </div>

        <div className="form-group">
          <label>Source of Questions (e.g., PYQ, Book, Test Series)</label>
          <input 
            type="text" 
            className="input" 
            value={source} 
            onChange={(e) => setSource(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Specific Doubts or Concepts to Revisit</label>
          <textarea 
            className="input" 
            style={{ height: "100px", resize: "none" }}
            placeholder="Write down topics that need clarification..."
            value={unsolvedDoubts} 
            onChange={(e) => setUnsolvedDoubts(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Notes / Key Pointers from Session</label>
          <textarea 
            className="input" 
            style={{ height: "100px", resize: "none" }}
            placeholder="Important formulas, takeaways, or pointers..."
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
          />
        </div>

        <button type="submit" className="btn btn-primary full-width" style={{ marginTop: "1.5rem", padding: "1rem", fontSize: "1.1rem" }}>
          Save & Exit Lockdown
        </button>
      </form>

      <style jsx global>{`
        .fullscreen-complete-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-color);
          padding: 2rem;
        }

        .complete-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          max-width: 550px;
          width: 100%;
          padding: 3rem;
          box-shadow: var(--shadow);
        }

        .complete-card h2 {
          font-size: 2rem;
          color: var(--accent);
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          letter-spacing: 0.5px;
        }

        .full-width {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
