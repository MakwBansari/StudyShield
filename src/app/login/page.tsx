"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login logic
    localStorage.setItem("user", JSON.stringify({ email }));
    router.push("/dashboard");
  };

  return (
    <div className="auth-body">
      <div className="card auth-card" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Welcome Back</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="input"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
            Log In
          </button>
        </form>
        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Don't have an account? <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none" }}>Sign Up</Link>
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
