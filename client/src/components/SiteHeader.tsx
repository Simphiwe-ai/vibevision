import Image from "next/image";
import Link from "next/link";
import { asset } from "@/lib/paths";

export default function SiteHeader() {
  return (
    <header className="navbar">
      <Link href="/" className="brand" aria-label="VibeVision Home">
        <Image
          src={asset("/vibevisionlogo.jpg")}
          alt="VibeVision logo"
          width={58}
          height={58}
          priority
          className="brand-logo"
        />
        <span>VibeVision</span>
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/restaurants">Restaurants &amp; Pubs</Link>
        <Link href="/search">Search</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </nav>

      <div className="nav-actions">
        <Link href="/login" className="login-link">
          Login
        </Link>
        <Link href="/createaccount" className="button button-small">
          Register
        </Link>
      </div>
    </header>
  );
}
