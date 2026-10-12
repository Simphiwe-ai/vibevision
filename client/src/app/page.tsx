"use client";

import Image from "next/image";

export default function Home() {
  return (
    <main className="vibevision-page">
      <header className="navbar">
        <a href="/" className="brand">
          <Image
            src="/vibevisionlogo.jpg"
            alt="VibeVision logo"
            width={58}
            height={58}
          />
          <span>VibeVision</span>
        </a>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to VibeVision</h1>
          <p>
            Feel the vibe. Experience restaurants, pubs and nightlife
            through live streaming.
          </p>
          <div className="hero-actions">
            <a href="/createaccount" className="button">
              Start Your Free Trial
            </a>
            <a href="/login" className="button button-outline">
              Login
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
