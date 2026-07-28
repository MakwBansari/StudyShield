"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StorageAPI } from "@/lib/storage";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    whitelist: "",
    blacklist: "",
  });
  const router = useRouter();

  const handleNext = () => setStep(2);
  const handleBack = () => setStep(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse and sanitize whitelist and blacklist
    const sanitize = (url: string) => {
      try {
        let str = url.trim().toLowerCase();
        if (!str || !str.includes(".")) return "";
        if (!str.startsWith("http://") && !str.startsWith("https://")) {
          str = "https://" + str;
        }
        return new URL(str).hostname.replace(/^www\./, "");
      } catch (e) {
        return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      }
    };

    const whitelistArr = Array.from(new Set(formData.whitelist.split("\n").map(sanitize).filter(Boolean)));
    const blacklistArr = Array.from(new Set(formData.blacklist.split("\n").map(sanitize).filter(Boolean)));

    const registration = StorageAPI.registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      preferences: {
        whitelist: whitelistArr,
        blacklist: blacklistArr,
      },
    });

    if (!registration.ok) {
      alert(registration.message || "Unable to create account.");
      return;
    }

    StorageAPI.setCurrentUser(formData.email);
    StorageAPI.saveSettings({
      whitelist: whitelistArr,
      blacklist: blacklistArr,
    });
    
    router.push("/dashboard");
  };

  return (
    <div className="auth-body">
      <div className="card auth-card" style={{ maxWidth: "400px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <img src="/logo.jpg" alt="StudyShield Logo" style={{ width: "120px", height: "120px", borderRadius: "50%", boxShadow: "0 0 25px rgba(245, 166, 35, 0.2)" }} />
        </div>
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Create Account</h2>
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div id="signup-step-1">
              <input
                type="text"
                className="input"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="email"
                className="input"
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                type="password"
                className="input"
                placeholder="Password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "1rem" }}
              >
                Next: Focus Preferences
              </button>
            </div>
          )}

          {step === 2 && (
            <div id="signup-step-2">
              <h3 style={{ fontSize: "1rem", marginBottom: "0.2rem", color: "var(--text-main)" }}>Whitelist (Allowed)</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
                Everything else will be blocked. Enter URLs like "google.com" or full links.
              </p>
              <textarea
                className="input"
                placeholder="e.g. nptel.ac.in, github.com (one per line)"
                style={{ height: "100px", resize: "none" }}
                value={formData.whitelist}
                onChange={(e) => setFormData({ ...formData, whitelist: e.target.value })}
              ></textarea>
              
              <h3 style={{ fontSize: "1rem", marginTop: "1rem", marginBottom: "0.2rem", color: "var(--text-main)" }}>Blacklist (Distractions)</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
                Explicitly block these even if whitelisted.
              </p>
              <textarea
                className="input"
                placeholder="e.g. instagram.com, youtube.com (one per line)"
                style={{ height: "100px", resize: "none" }}
                value={formData.blacklist}
                onChange={(e) => setFormData({ ...formData, blacklist: e.target.value })}
              ></textarea>
              
              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button type="button" onClick={handleBack} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Create Account</button>
              </div>
            </div>
          )}
        </form>
        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none" }}>Log In</Link>
        </div>
      </div>
      <style jsx global>{`
        .auth-body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-color);
          padding: 2rem;
        }
        .auth-card {
          padding: 2.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
        }
        .input {
          width: 100%;
          background: var(--bg-card-hover);
          border: 1px solid var(--border);
          color: var(--text-main);
          padding: 0.8rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-family: inherit;
        }
        .input:focus {
          border-color: var(--accent);
          outline: none;
        }
      `}</style>
    </div>
  );
}
