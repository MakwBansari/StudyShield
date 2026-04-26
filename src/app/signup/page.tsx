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
    localStorage.setItem("user", JSON.stringify({ name: formData.name, email: formData.email }));
    
    // Parse whitelist and blacklist
    const whitelistArr = formData.whitelist.split("\n").map(s => s.trim()).filter(Boolean);
    const blacklistArr = formData.blacklist.split("\n").map(s => s.trim()).filter(Boolean);

    // Save preferences
    StorageAPI.saveSettings({
      whitelist: whitelistArr.length > 0 ? whitelistArr : undefined,
      blacklist: blacklistArr.length > 0 ? blacklistArr : undefined,
    });
    
    router.push("/dashboard");
  };

  return (
    <div className="auth-body">
      <div className="card auth-card" style={{ maxWidth: "400px", width: "100%" }}>
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
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Whitelist (Max 10)</h3>
              <textarea
                className="input"
                placeholder="e.g. google.com, stackoverflow.com (one per line)"
                style={{ height: "100px", resize: "none" }}
                value={formData.whitelist}
                onChange={(e) => setFormData({ ...formData, whitelist: e.target.value })}
              ></textarea>
              
              <h3 style={{ fontSize: "1rem", marginTop: "1rem", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Blacklist (Max 10)</h3>
              <textarea
                className="input"
                placeholder="e.g. facebook.com, instagram.com (one per line)"
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
