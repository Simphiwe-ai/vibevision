"use client";

import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/paths";

export default function Home() {
  return (
    <main className="vibevision-page">
      <header className="navbar">
        <Link href="/" className="brand">
          <Image
            src={asset("/vibevisionlogo.jpg")}
            alt="VibeVision logo"
            width={58}
            height={58}
          />
          <span>VibeVision</span>
        </Link>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to VibeVision</h1>
          <p>
            Feel the vibe. Experience restaurants, pubs and nightlife
            through live streaming.
          </p>
          <div className="hero-actions">
            <Link href="/createaccount" className="button">
              Start Your Free Trial
            </Link>
            <Link href="/login" className="button button-outline">
              Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
