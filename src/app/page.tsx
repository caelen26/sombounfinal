"use client";

import { useEffect, useState } from "react";

const reviews = [
  {
    text: "Hi just wanted to share my thoughts on the product :) I have the spf tint I have used it for about 3 months now and my skin has changed! I have very dry skin so I use my own moisturizer and then the spf on top whenever I go out and I noticed how my acne marks cleared up around my chin area. People have noticed too. Thought I share my review 🫶🏻",
    name: "MELLA JOHNSON",
    email: "mella@gmail.com",
  },
  {
    text: "Loving the tinted tallow! NŪM tallow has replaced my moisturizer and my eye cream and has simplified my routines! Works great as a makeup primer as well and also nice for the days where you don't wear make up!",
    name: "HAPPY CUSTOMER",
    email: "",
  },
  {
    text: "I've been using your tallow for about 1.5 months and holy cow (literally)!!! My skin has improved so much and it's so soft!",
    name: "HAPPY CUSTOMER",
    email: "",
  },
];

function buildQuatPath(w: number, h: number, opts?: { rFactor?: number }) {
  const min = Math.min(w, h);
  const rFactor = opts?.rFactor ?? 0.055;
  const R = Math.max(10, Math.min(min * rFactor, 32));
  const M = Math.max(8, Math.min(min * 0.048, 24));
  const cx = w / 2;
  const cy = h / 2;
  return [
    `M ${R} 0`,
    `L ${cx - M} 0`,
    `A ${M} ${M} 0 0 1 ${cx + M} 0`,
    `L ${w - R} 0`,
    `A ${R} ${R} 0 0 1 ${w} ${R}`,
    `L ${w} ${cy - M}`,
    `A ${M} ${M} 0 0 1 ${w} ${cy + M}`,
    `L ${w} ${h - R}`,
    `A ${R} ${R} 0 0 1 ${w - R} ${h}`,
    `L ${cx + M} ${h}`,
    `A ${M} ${M} 0 0 1 ${cx - M} ${h}`,
    `L ${R} ${h}`,
    `A ${R} ${R} 0 0 1 0 ${h - R}`,
    `L 0 ${cy + M}`,
    `A ${M} ${M} 0 0 1 0 ${cy - M}`,
    `L 0 ${R}`,
    `A ${R} ${R} 0 0 1 ${R} 0`,
    "Z",
  ].join(" ");
}

export default function Home() {
  // Infinite-loop slider: clone last slide at front, first slide at back
  const extendedReviews = [reviews[reviews.length - 1], ...reviews, reviews[0]];
  const [vIdx, setVIdx] = useState(1); // start at first real slide (index 1)
  const [noAnim, setNoAnim] = useState(false);
  const [cfSubmitted, setCfSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCfSubmitted(true);
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const goNext = () => setVIdx((i) => i + 1);
  const goPrev = () => setVIdx((i) => i - 1);

  const handleTransitionEnd = () => {
    if (vIdx >= extendedReviews.length - 1) {
      setNoAnim(true);
      setVIdx(1);
    } else if (vIdx <= 0) {
      setNoAnim(true);
      setVIdx(extendedReviews.length - 2);
    }
  };

  useEffect(() => {
    if (noAnim) {
      const id = requestAnimationFrame(() => setNoAnim(false));
      return () => cancelAnimationFrame(id);
    }
  }, [noAnim]);

  useEffect(() => {
    const id = setInterval(() => setVIdx((i) => i + 1), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const applyQuat = (el: Element) => {
      const html = el as HTMLElement;
      const r = html.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const isVideo = html.dataset.quatStyle === "video";
      html.style.clipPath = `path("${buildQuatPath(
        r.width,
        r.height,
        isVideo ? { rFactor: 0.035 } : undefined
      )}")`;
    };

    const applyAllQuats = () => {
      document.querySelectorAll(".quatre").forEach(applyQuat);
    };

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) applyQuat(e.target);
    });
    const quats = document.querySelectorAll(".quatre");
    quats.forEach((el) => ro.observe(el));

    applyAllQuats();
    requestAnimationFrame(() => {
      applyAllQuats();
      requestAnimationFrame(applyAllQuats);
    });
    window.addEventListener("load", applyAllQuats);
    const timeouts = [100, 300, 600, 1200].map((t) =>
      window.setTimeout(applyAllQuats, t)
    );

    const header = document.querySelector(".header");
    let lastY = 0;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          header?.classList.toggle("scrolled", y > 40);
          if (y > lastY && y > 80) header?.classList.add("hidden");
          else header?.classList.remove("hidden");
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll);

    const backToTop = document.querySelector(".back-to-top");
    const onBackToTop = (e: Event) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    backToTop?.addEventListener("click", onBackToTop);

    return () => {
      ro.disconnect();
      window.removeEventListener("load", applyAllQuats);
      window.removeEventListener("scroll", onScroll);
      backToTop?.removeEventListener("click", onBackToTop);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <>
      <header className="header">
        <div className="logo">Somboun June</div>
        <nav className="nav" aria-label="primary">
          <a href="#journey">The Journey</a>
          <a href="#num">NŪM</a>
          <a href="#laser">Laser Skin Care</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="icon-row">
          <button className="icon-btn" aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </button>
        </div>

        {/* Hamburger — visible on mobile only */}
        <button
          className={`hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((m) => !m)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Mobile full-screen nav overlay */}
      <div className={`mobile-overlay${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
        <div className="mobile-overlay-top">
          <div className="logo">Somboun June</div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="mobile-nav" aria-label="mobile primary">
          <a href="#journey" onClick={() => setMenuOpen(false)}>The Journey</a>
          <a href="#num" onClick={() => setMenuOpen(false)}>NŪM</a>
          <a href="#laser" onClick={() => setMenuOpen(false)}>Laser Skin Care</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
      </div>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-thumbs" aria-hidden="true">
            <div className="t" style={{ backgroundImage: 'url("/circle-1.png")' }} />
            <div className="t" style={{ backgroundImage: 'url("/circle-2.png")' }} />
            <div className="t" style={{ backgroundImage: 'url("/circle-3.png")' }} />
          </div>

          <div className="hero-headline-row">
            <h1 className="hero-headline">
              Good Skin, Good Hair,<br />
              Great Life
            </h1>
          </div>

          <div className="hero-media">
            <div
              className="quatre"
              data-quat-style="video"
              style={{ overflow: "hidden" }}
            >
              <video
                src="/video.mp4"
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="journey" className="section">
        <div className="section-inner">
          <div className="story-grid">
            <div className="story-text">
              <div className="story-eyebrow">THE JOURNEY</div>
              <h2 className="story-heading">
                <span>Somboun&apos;s</span>
                <span><em style={{ fontStyle: "italic", fontWeight: 500, color: "var(--sage-deep)" }}>Story</em></span>
              </h2>
              <p className="story-body">
                Somboun June is a distinguished beauty and wellness professional based in Winnipeg Manitoba, specializing in laser skin treatments and premium skincare products.
              </p>
              <p className="story-body">
                As the founder of NŪM Skincare, a premium line of grass-fed tallow-based products, Somboun has transitioned from celebrated hair artistry to innovative skin wellness, bringing over a decade of beauty industry expertise to her craft.
              </p>
            </div>
            <div className="story-image">
              <div className="quatre bg-greenmask" style={{ aspectRatio: "4/5" }} />
            </div>
          </div>
        </div>
      </section>

      <section id="laser" className="section">
        <div className="section-inner">
          <div className="editorial-intro">
            <h2>Laser Skin Care</h2>
            <div className="sub">Sharplight Treatment Menu</div>
          </div>

          <div className="tx-grid">

            {/* ── 01 Fractional Laser ── */}
            <div className="tx-card tx-card--sage">
              <div className="tx-body">
                <div className="tx-meta">
                  <span className="tx-num tx-num--sage">01</span>
                  <span className="tx-price">$600<span className="tx-price-unit"> / face</span></span>
                </div>
                <h3 className="tx-name">Sharplight<br />Fractional Laser</h3>
                <p className="tx-tagline">Advanced resurfacing for smoother, brighter, youthful skin.</p>
                <hr className="tx-rule" />
                <div className="tx-stats">
                  <div className="tx-stat">
                    <div className="tx-stat-label">Downtime</div>
                    <div className="tx-stat-value">3–7 days</div>
                  </div>
                  <div className="tx-stat">
                    <div className="tx-stat-label">Sessions</div>
                    <div className="tx-stat-value">1–3</div>
                  </div>
                  <div className="tx-stat">
                    <div className="tx-stat-label">Results</div>
                    <div className="tx-stat-value">~3 months</div>
                  </div>
                </div>
                <hr className="tx-rule" />
                <p className="tx-ideal">Best for ages 25+ with fine lines, acne scars, or uneven skin tone.</p>
              </div>
            </div>

            {/* ── 02 RF Face Contouring ── */}
            <div className="tx-card tx-card--ink">
              <div className="tx-body">
                <div className="tx-meta">
                  <span className="tx-num tx-num--ink">02</span>
                </div>
                <h3 className="tx-name">Sharplight RF<br />Face Contouring</h3>
                <p className="tx-tagline">Non-invasive lifting and firming for sculpted, youthful contours.</p>
                <hr className="tx-rule" />
                <div className="tx-stats">
                  <div className="tx-stat">
                    <div className="tx-stat-label">Downtime</div>
                    <div className="tx-stat-value">None</div>
                  </div>
                  <div className="tx-stat">
                    <div className="tx-stat-label">Sessions</div>
                    <div className="tx-stat-value">6–8</div>
                  </div>
                  <div className="tx-stat">
                    <div className="tx-stat-label">Results</div>
                    <div className="tx-stat-value">8–12 wks</div>
                  </div>
                </div>
                <hr className="tx-rule" />
                <p className="tx-ideal">Best for mild skin laxity, preventative aging, or post-weight loss contouring.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="num" className="sage-section">
        <div className="sage-grid">
          <div className="sage-feature">
            <div className="quatre" style={{ backgroundImage: 'url("/refined-num-image.png")' }} />
          </div>
          <div className="sage-right">
            <div className="sage-eyebrow">BEST-SELLING SKINCARE</div>
            <h2 className="sage-heading">NŪM<br />Skin Care</h2>
            <div className="sage-body">
              <p>Grass-fed cattle are the best source for tallow-based skincare because they are animals that have been pasture-raised, providing a nutrient-rich diet. This results in tallow with a higher concentration of beneficial compounds, such as omega-3 fatty acids and antioxidants. These elements contribute to improved skin hydration, elasticity, and overall skin health.</p>
              <ul>
                <li>Pasture-Raised &amp; Grass-Fed</li>
                <li>Rich in Omega-3 &amp; Antioxidants</li>
                <li>Deep Hydration &amp; Elasticity</li>
                <li>100% Biocompatible</li>
              </ul>
            </div>
          </div>
        </div>

      </section>

      <section className="testimonial">
        <div className="t-eyebrow">TESTIMONIALS</div>
        <div className="quote-slider">
          <div
            className="quote-track"
            style={{
              transform: `translateX(-${vIdx * 100}%)`,
              transition: noAnim ? "none" : "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extendedReviews.map((r, i) => (
              <blockquote key={i} className="quote">
                <span className="mark">&ldquo;</span>{r.text}<span className="mark">&rdquo;</span>
              </blockquote>
            ))}
          </div>
        </div>

        <div className="t-meta">
          <button className="prev" onClick={goPrev}>← PREV</button>
          <div />
          <button className="next" onClick={goNext}>NEXT →</button>
        </div>

        <div className="filmstrip">
          <div className="frame bg-film-1" />
          <div className="frame bg-film-2" />
          <div className="frame bg-film-3" />
          <div className="frame bg-film-4" />
          <div className="frame bg-film-5 color" />
          <div className="frame bg-film-6" />
          <div className="frame bg-film-7" />
          <div className="frame bg-film-8" />
        </div>
      </section>

      {/* ── Contact Form ── */}
      <section id="contact" className="cf-section">
        <div className="section-inner">
          <div className="cf-grid">

            {/* Left: intro */}
            <div className="cf-left">
              <div className="cf-eyebrow">Contact</div>
              <h2 className="cf-heading">Book a<br />Consultation</h2>
              <p className="cf-tagline">Ready to begin your skin journey? Send a message and we&rsquo;ll be in touch within 24 hours.</p>
              <div className="cf-meta">
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Location</span>
                  <span className="cf-meta-value">Winnipeg, Manitoba</span>
                </div>
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Hours</span>
                  <span className="cf-meta-value">Mon–Fri, 9am–6pm CST</span>
                </div>
                <div className="cf-meta-item">
                  <span className="cf-meta-label">Email</span>
                  <span className="cf-meta-value">sombounp@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="cf-right">
              {cfSubmitted ? (
                <div className="cf-thanks">
                  <p className="cf-thanks-eyebrow">Message sent</p>
                  <h3 className="cf-thanks-heading">Thank you.</h3>
                  <p className="cf-thanks-text">We&rsquo;ve received your message and will be in touch within 24 hours.</p>
                </div>
              ) : (
                <form className="cf-form" onSubmit={handleContactSubmit}>
                  <div className="cf-row">
                    <div className="cf-field">
                      <label className="cf-label" htmlFor="cf-first">First Name</label>
                      <input className="cf-input" id="cf-first" name="first" type="text" placeholder="First" required />
                    </div>
                    <div className="cf-field">
                      <label className="cf-label" htmlFor="cf-last">Last Name</label>
                      <input className="cf-input" id="cf-last" name="last" type="text" placeholder="Last" required />
                    </div>
                  </div>
                  <div className="cf-field">
                    <label className="cf-label" htmlFor="cf-email">Email</label>
                    <input className="cf-input" id="cf-email" name="email" type="email" placeholder="hello@example.com" required />
                  </div>
                  <div className="cf-field">
                    <label className="cf-label" htmlFor="cf-phone">Phone <span className="cf-optional">(optional)</span></label>
                    <input className="cf-input" id="cf-phone" name="phone" type="tel" placeholder="+1 (204) 000–0000" />
                  </div>
                  <div className="cf-field">
                    <label className="cf-label" htmlFor="cf-message">Message</label>
                    <textarea className="cf-textarea" id="cf-message" name="message" placeholder="I&apos;m interested in learning more about..." rows={4} required />
                  </div>
                  <button type="submit" className="cf-submit">Send Message →</button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">Somboun June</div>
            <p className="footer-blurb">
              We are dedicated to helping you feel confident in your own skin. Our treatments focus on enhancing your natural beauty, restoring radiance, and gently improving skin health from the inside out.
            </p>
            <div className="footer-ctas">
              <a className="footer-cta" href="#journey">Get Started <span>→</span></a>
              <a className="footer-cta" href="#contact">Contact Us <span>→</span></a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Navigate</h4>
            <ul>
              <li><a href="#journey">The Journey</a></li>
              <li><a href="#num">NŪM</a></li>
              <li><a href="#laser">Laser Skin Care</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Social Media</h4>
            <div className="socials">
              <a className="social-dot ring" href="https://www.instagram.com/sombounjune/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="subfoot">
          <div>©2026 Somboun June. All Rights Reserved.</div>
        </div>
      </footer>
    </>
  );
}
