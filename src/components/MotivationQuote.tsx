"use client";

import React, { useState, useEffect } from "react";

const quotes = [
  "No cap, your consistency is looking fine today. Keep going.",
  "Manifesting that AIR < 100 for you. Stay on the grind.",
  "Go off, study king. Secure the bag (and the rank).",
  "Main character energy activated. Time to lock in.",
  "The grind don't stop, literally. You've got this.",
  "Stop scrolling TikTok, start scrolling your notes.",
  "Delulu is the only solulu until you actually study.",
  "Sending you positive vibes and high marks only.",
  "Imagine the flex when you get that IIT call. Study now.",
  "You're doing amazing, sweetie. Don't quit now."
];

export default function MotivationQuote() {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <div style={{ marginBottom: "2.5rem", padding: "0 0.5rem" }}>
      <div style={{ 
        fontSize: "0.7rem", 
        textTransform: "uppercase", 
        letterSpacing: "2px", 
        color: "var(--text-muted)", 
        marginBottom: "0.75rem", 
        fontWeight: 700 
      }}>
        Daily Inspiration
      </div>
      <h2 className="animate-reveal" style={{ 
        fontSize: "2.2rem", 
        fontWeight: 700, 
        color: "var(--text-main)", 
        margin: 0, 
        lineHeight: "1.2", 
        letterSpacing: "-0.5px" 
      }}>
        "{quote}"
      </h2>
      <style jsx>{`
        .animate-reveal {
          animation: titleSlideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes titleSlideIn {
          from { opacity: 0; transform: translateX(-30px); filter: blur(10px); }
          to { opacity: 1; transform: translateX(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
}
