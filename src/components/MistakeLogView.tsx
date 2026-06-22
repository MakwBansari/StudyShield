"use client";

import React, { useState, useEffect } from "react";
import { Mistake } from "@/lib/types";
import { StorageAPI } from "@/lib/storage";

export default function MistakeLogView() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [correctConcept, setCorrectConcept] = useState("");

  useEffect(() => {
    setMistakes(StorageAPI.getMistakes());
  }, []);

  const handleAdd = () => {
    if (!subject || !description || !correctConcept) {
      alert("Please fill in Subject, Mistake, and Correct Concept.");
      return;
    }
    const newMistake: Mistake = {
      id: Date.now().toString(),
      subject,
      topic,
      description,
      correctConcept,
      timestamp: Date.now()
    };
    StorageAPI.saveMistake(newMistake);
    setMistakes(StorageAPI.getMistakes());
    setTopic("");
    setDescription("");
    setCorrectConcept("");
  };

  const handleDelete = (id: string) => {
    StorageAPI.deleteMistake(id);
    setMistakes(StorageAPI.getMistakes());
  };

  return (
    <div className="mistake-log-container animate-fade-in">
      <div className="notebook-left">
        <h3>📓 Log a Mistake</h3>
        <div className="form-group">
          <label>Subject</label>
          <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Operating Systems" />
        </div>
        <div className="form-group">
          <label>Topic (Optional)</label>
          <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Page Replacement" />
        </div>
        <div className="form-group">
          <label>What went wrong?</label>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Used LRU instead of FIFO..." rows={3} />
        </div>
        <div className="form-group">
          <label>Correct Concept / Formula</label>
          <textarea className="input" value={correctConcept} onChange={e => setCorrectConcept(e.target.value)} placeholder="Write down the correct way..." rows={3} />
        </div>
        <button className="btn btn-primary" onClick={handleAdd}>Add to Notebook</button>
      </div>

      <div className="notebook-right">
        <h3>Your Error Log</h3>
        {mistakes.length === 0 ? (
          <p className="empty-state">No mistakes logged yet. You're perfect!</p>
        ) : (
          <div className="mistake-list">
            {mistakes.map(m => (
              <div key={m.id} className="mistake-card">
                <button className="delete-btn" onClick={() => handleDelete(m.id)}>×</button>
                <div className="mistake-header">
                  <span className="badge">{m.subject}</span>
                  {m.topic && <span className="topic">{m.topic}</span>}
                  <span className="date">{new Date(m.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="mistake-body">
                  <div className="wrong">
                    <strong>❌ Mistake:</strong>
                    <p>{m.description}</p>
                  </div>
                  <div className="right">
                    <strong>✅ Correct:</strong>
                    <p>{m.correctConcept}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
