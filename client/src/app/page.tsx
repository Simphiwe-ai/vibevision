import Image from "next/image";

const locations = [
  "Johannesburg",
  "Soweto",
  "Sandton",
  "Pretoria",
  "Durban",
  "Cape Town",
  "Bloemfontein",
  "Polokwane",
  "East London",
  "Gqeberha",
];

export default function Home() {
  return (
    <main className="vibevision-page">
      <header className="navbar">
        <a href="/" className="brand" aria-label="VibeVision Home">
          <Image
            src="/vibevisionlogo.jpg"
            alt="VibeVision logo"
            width={58}
            height={58}
            priority
            className="brand-logo"
          />
          <span>VibeVision</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/restaurants">Restaurants &amp; Pubs</a>
          <a href="/search">Search</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>

        <div className="nav-actions">
          <a href="/login" className="login-link">
            Login
          </a>
          <a href="/register" className="button button-small">
            Register
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">YOUR CITY. YOUR PEOPLE. YOUR VIBE.</p>

          <h1>
            Welcome to <span>VibeVision</span>
          </h1>

          <p className="hero-description">
            Feel the vibe. Experience restaurants, pubs and nightlife through
            live streaming. Discover your next favourite spot before you even
            leave home.
          </p>

          <div className="hero-actions">
            <a href="/register" className="button">
              Start Your Free Trial <span aria-hidden="true">→</span>
            </a>
            <a href="/restaurants" className="button button-outline">
              Explore Restaurants
            </a>
          </div>

          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">◉</span>
              <div>
                <strong>Live experiences</strong>
                <p>Explore the atmosphere in real time</p>
              </div>
            </div>

            <div className="feature">
              <span className="feature-icon">⌖</span>
              <div>
                <strong>Discover local spots</strong>
                <p>Find places around your city</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="locations-section">
        <div className="section-heading">
          <p className="eyebrow">FIND YOUR NEXT DESTINATION</p>
          <h2>Explore by location</h2>
          <p>Choose a city and discover restaurants, pubs and nightlife.</p>
        </div>

        <div className="location-grid">
          {locations.map((location) => (
            <a
              key={location}
              href={`/restaurants?location=${encodeURIComponent(location)}`}
              className="location-button"
            >
              {location}
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} VibeVision. Feel the vibe.</p>
        <div>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/login">Sign in</a>
        </div>
      </footer>
    </main>
  );
}
