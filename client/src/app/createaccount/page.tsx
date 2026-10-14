"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = event.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!formData.terms) {
      setMessage("Please accept the Terms and Conditions.");
      return;
    }

    setSubmitting(true);

    const result = await signUp({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });

    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setMessage(
      "Welcome to VibeVision! Your " +
        result.data.user.trial.daysLeft +
        "-day free trial has started.",
    );

    setTimeout(() => router.push("/restaurants"), 1500);
  }

  return (
    <main className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Start Your 31-Day Free Trial</h1>

          <p>
            Join VibeVision and discover live streams from restaurants and
            pubs. No payment needed to start.
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (optional)</label>

            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <PasswordInput
              id="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
            />

            <small>Password must contain at least 8 characters.</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>

            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <div className="terms-group">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={formData.terms}
              onChange={handleChange}
            />

            <label htmlFor="terms">
              I agree to the VibeVision Terms and Conditions.
            </label>
          </div>

          {message && <div className="register-message">{message}</div>}

          <button
            type="submit"
            className="register-button"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Start Free Trial"}
          </button>

          <p className="login-link">
            Already have an account? <Link href="/login">Login here</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
