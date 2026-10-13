"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { logIn } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setSubmitting(true);

    const result = await logIn(email.trim(), password);

    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    const trial = result.data.user.trial;

    if (!trial.active && result.data.user.accountType !== "admin") {
      setMessage(
        "Your 31-day free trial has ended. Subscription options are coming soon.",
      );
      return;
    }

    setMessage(
      "Welcome back! You have " + trial.daysLeft + " days left in your free trial.",
    );

    setTimeout(() => router.push("/restaurants"), 1200);
  }

  return (
    <main className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Welcome Back</h1>

          <p>Log in to keep watching live streams from your favourite venues.</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {message && <div className="register-message">{message}</div>}

          <button
            type="submit"
            className="register-button"
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </button>

          <p className="login-link">
            New here? <Link href="/createaccount">Start your free trial</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
