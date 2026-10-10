"use client";

import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export default function Home() {
  return (
    <div className="vibevision">
      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        {/* Logo */}
        <Link href="/" className="logo-button">
          <Image
            src="/vibevisionlogo.jpg"
            alt="VibeVision"
            width={120}
            height={40}
            className="logo"
          />
        </Link>

        {/* Navigation */}
        <nav className="nav-links">
          <Link href="/" className="nav-link active">Home</Link>
          <a href="#explore">Explore</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About Us</a>
          <a href="#contact">Contact</a>
        </nav>

        {/* Authentication */}
        <div className="nav-actions">
          <Link href="/login" className="login-button">Log In</Link>
          <Link href="/register" className="signup-button">Sign Up</Link>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <main>
        {/* Hero */}
        <section className="hero">
          <div className="hero-content">
            <h1>
              Live Moments.<br />Real <span>Vibes.</span>
            </h1>
            <p className="hero-description">
              VibeVision lets restaurants and pubs live stream their vibe in real-time.
              Discover places, watch live, and feel the atmosphere from anywhere.
            </p>
            {/* Mini Features */}
            <div className="mini-features">
              <div className="mini-feature">
                <div className="feature-icon">📡</div>
                <h3>Go Live</h3>
                <p>Stream your restaurant or pub in stunning live quality.</p>
              </div>
              <div className="mini-feature">
                <div className="feature-icon">🧭</div>
                <h3>Discover</h3>
                <p>Explore live venues near you and around the world.</p>
              </div>
              <div className="mini-feature">
                <div className="feature-icon">💬</div>
                <h3>Engage</h3>
                <p>Chat with viewers and build your community.</p>
              </div>
            </div>
          </div>

          {/* Trial Card */}
          <div className="trial-card">
            <div className="trial-header">
              <div className="trial-icon">🎁</div>
              <div>
                <h2>Start Your <span>7-Day Free Trial</span></h2>
                <p>Create your account to start streaming or watching live.</p>
              </div>
            </div>
            <form className="register-form">
              <div className="form-row">
                <input type="text" placeholder="First Name" required />
                <input type="text" placeholder="Last Name" required />
              </div>
              <input type="email" placeholder="Email Address" required />
              <input type="password" placeholder="Password" required />
              <select required defaultValue="">
                <option value="" disabled>I am a...</option>
                <option value="viewer">Viewer</option>
                <option value="restaurant">Restaurant Owner</option>
                <option value="pub">Pub Owner</option>
              </select>
              <button type="submit" className="trial-button">
                Create Account & Start Free Trial
              </button>
            </form>
            <p className="terms">
              By signing up, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <div className="trial-divider"></div>
            <p className="existing-account">
              Already have an account? <Link href="/login">Log in</Link>
            </p>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="footer" id="contact">
        <div className="footer-logo">
          <Link href="/" className="footer-logo-button">
            <Image src="/vibevisionlogo.jpg" alt="VibeVision" width={100} height={20} />
          </Link>
          <p>Feel the vibe. Anywhere.</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Platform</h4>
            <a href="#explore">Explore</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
