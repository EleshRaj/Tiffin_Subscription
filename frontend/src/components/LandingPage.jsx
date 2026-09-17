export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="hero" id="hero">
        <div className="hero-emoji">🍱</div>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--clr-primary)', marginBottom: '0.5rem' }}>
          Tif Tof
        </div>
        <h1>Smart Tiffin Subscription Management</h1>
        <p>
          Track customers, manage subscriptions, handle pause/resume, and auto-generate
          pro-rated monthly bills — all in one place.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" id="hero-get-started" onClick={onGetStarted}>
            Get Started →
          </button>
          <a className="btn btn-secondary btn-lg" href="#features">
            Explore Features
          </a>
        </div>
      </section>

      {/* ── Key Features ─────────────────────────────────────────── */}
      <section className="section" id="features">
        <h2 className="section-title">Key Features</h2>
        <p className="section-subtitle">Everything a tiffin owner needs to run their business efficiently</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3 className="feature-title">Customer Management</h3>
            <p className="feature-desc">Add, search, edit, and track all your tiffin customers from a single dashboard with phone-based instant search.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3 className="feature-title">Monthly Subscriptions</h3>
            <p className="feature-desc">Subscribe customers to flexible monthly tiffin plans with custom pricing and track their active status.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏸️</div>
            <h3 className="feature-title">Pause & Resume</h3>
            <p className="feature-desc">When a customer travels or takes a break, pause their service for specific dates and resume with one click.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧾</div>
            <h3 className="feature-title">Pro-Rated Billing</h3>
            <p className="feature-desc">Automatically calculate monthly bills based on days served. Paused days are deducted proportionally — fair & transparent.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Phone Search</h3>
            <p className="feature-desc">Find any customer instantly by searching their phone number — the fastest way to locate records.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Dashboard Analytics</h3>
            <p className="feature-desc">View total customers, active/paused counts, and estimated monthly revenue at a glance on your dashboard.</p>
          </div>
        </div>
      </section>

      {/* ── Target Audience ──────────────────────────────────────── */}
      <section className="section">
        <div className="audience-section" id="audience">
          <h2 className="section-title">Who Is This For?</h2>
          <p className="section-subtitle">Built for the people who feed communities</p>
          <div className="audience-list">
            <div className="audience-item">
              <div className="audience-icon">🏠</div>
              <div className="audience-text">Home-style tiffin services</div>
            </div>
            <div className="audience-item">
              <div className="audience-icon">🍛</div>
              <div className="audience-text">Small lunch delivery businesses</div>
            </div>
            <div className="audience-item">
              <div className="audience-icon">👨‍🍳</div>
              <div className="audience-text">Local food subscription owners</div>
            </div>
            <div className="audience-item">
              <div className="audience-icon">🏢</div>
              <div className="audience-text">Office & PG meal suppliers</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Helps ─────────────────────────────────────────── */}
      <section className="section" id="how-it-helps">
        <h2 className="section-title">How It Helps</h2>
        <p className="section-subtitle">Eliminate manual tracking and billing headaches</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3 className="feature-title">Save Hours of Manual Work</h3>
            <p className="feature-desc">No more paper registers. The system tracks every pause, resume, and service day automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3 className="feature-title">Fair & Accurate Billing</h3>
            <p className="feature-desc">Customers are charged only for the days they were actually served — building trust and preventing disputes.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3 className="feature-title">Access Anywhere</h3>
            <p className="feature-desc">Responsive web-based interface works on desktop, tablet, and mobile — manage your business on the go.</p>
          </div>
        </div>
      </section>

      {/* ── Three Future Features ────────────────────────────────── */}
      <section className="section future-section" id="future">
        <h2 className="section-title">What's Coming Next</h2>
        <p className="section-subtitle">Three features we would build next to make TiffinSubs even better</p>
        <div className="future-cards">
          <div className="future-card">
            <div className="future-number">1</div>
            <h3 className="future-title">Online Payments</h3>
            <p className="future-desc">UPI and card payments so customers can pay their monthly bill directly through the app.</p>
          </div>
          <div className="future-card">
            <div className="future-number">2</div>
            <h3 className="future-title">WhatsApp Notifications</h3>
            <p className="future-desc">Automated bill reminders, delivery confirmations, and pause confirmations via WhatsApp.</p>
          </div>
          <div className="future-card">
            <div className="future-number">3</div>
            <h3 className="future-title">Delivery Staff Management</h3>
            <p className="future-desc">Assign delivery boys, optimise routes, and track real-time delivery status.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="footer">
        <p>© 2026 Tif Tof — Tiffin Subscription Management System. Built with ❤️</p>
      </footer>
    </div>
  );
}
