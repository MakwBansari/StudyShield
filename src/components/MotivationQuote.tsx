"use client";

import React, { useState, useEffect } from "react";

interface MotivationQuoteProps {
  userName?: string;
}

export default function MotivationQuote({ userName }: MotivationQuoteProps) {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const name = (userName && userName !== "N/A") ? userName : "bestie"; // GenZ fallback
    const quotes = [
      `No cap ${name}, your consistency is looking fine today. Keep going.`,
      `Manifesting that AIR < 100 for you, ${name}. Stay on the grind.`,
      `Go off, ${name}. Secure the bag (and the rank).`,
      `Main character energy activated for ${name}. Time to lock in.`,
      `The grind don't stop, ${name}. You've got this.`,
      `Stop scrolling TikTok, ${name}. Start scrolling your notes.`,
      `Delulu is the only solulu for ${name} until you actually study.`,
      `Sending you positive vibes and high marks only, ${name}.`,
      `Imagine the flex when you get that IIT call, ${name}. Study now.`,
      `You're doing amazing, ${name}. Don't quit now.`
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, [userName]);

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
