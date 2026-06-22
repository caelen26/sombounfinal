"use client";

import { useEffect, useRef, useState } from "react";

const RIMAN_URL =
  "https://mall.riman.com/member-ship/home?referrerCode=4007357701&utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnSzlvjf0O5Yyn99fFymE0Aky-MiXIB-0PzUTIDENClmui_dqi2nUpcTGlGEc_aem_a7CJKao6iWR6PtZ_yXHYNw";

// Cal.com booking URL — opens inside the booking modal as an embedded iframe.
const CAL_BOOKING_URL = "https://cal.com/caelen-yung26/website-meeting";

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

// ── Product type (matches @/lib/stripe Product) ──────────────────────────────
type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  images: string[];
  description?: string;
  priceId?: string;
  features?: string[];
  ingredients?: string[];
};

// Brand prefix → [brand label, category] (longest-prefix first to avoid partial matches)
const BRAND_MAP: [string, string, string][] = [
  ["Schwarzkopf Professional", "Schwarzkopf Professional", "Hair Care"],
  ["Kevin.Murphy + Color.Me", "Kevin.Murphy", "Hair Care"],
  ["Kevin.Murphy", "Kevin.Murphy", "Hair Care"],
  ["Living Proof", "Living Proof", "Hair Care"],
  ["Color Wow", "Color Wow", "Hair Care"],
  ["iS Clinical", "iS Clinical", "Skin Care"],
  ["Mayfa MD", "Mayfa MD", "Skin Care"],
  ["NŪM Skin", "NŪM Skin", "Skin Care"],
  ["Incellderm", "Incellderm", "Skin Care"],
  ["Botalab", "Botalab", "Hair Care"],
  ["DesignME", "DesignME", "Hair Care"],
  ["Lifening", "Lifening", "Wellness"],
  ["Olaplex", "Olaplex", "Hair Care"],
  ["Joico", "Joico", "Hair Care"],
  ["Neuma", "Neuma", "Hair Care"],
  ["MIFA", "MIFA", "Body Care"],
  ["Unite", "Unite", "Hair Care"],
  ["K18", "K18", "Hair Care"],
  ["evo", "evo", "Hair Care"],
  ["NŪM", "NŪM", "Skin Care"],
];
function getBrand(name: string): string {
  for (const [prefix, brand] of BRAND_MAP) {
    if (name.startsWith(prefix)) return brand;
  }
  return name.split(" ")[0] || name;
}
function getProductName(name: string): string {
  for (const [prefix] of BRAND_MAP) {
    if (name.startsWith(prefix)) return name.slice(prefix.length).trim();
  }
  return name;
}

// Fallback products shown before Stripe data loads
const FALLBACK_BEST_SELLERS: Product[] = [
  {
    id: "num-body-tallow",
    name: "NŪM Body Tallow",
    price: 29.99,
    currency: "cad",
    image: "/refined-num-image.png",
    images: ["/refined-num-image.png", "/image-2.png"],
  },
  {
    id: "num-face-tallow",
    name: "NŪM Face Tallow",
    price: 29.99,
    currency: "cad",
    image: "/skintallow.png",
    images: ["/skintallow.png", "/image-2.png"],
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
  const [bestSellers, setBestSellers] = useState<Product[]>(FALLBACK_BEST_SELLERS);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Product modal state + refs
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const modalOpen = modalProduct !== null;
  const [openAccordion, setOpenAccordion] = useState<"details" | "ingredients" | null>("details");
  // Carousel indices — modal only (card sliders removed per design update)
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  // Cart state
  type CartItem = Product & { quantity: number };
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  // Key format: `${source}:${productId}` — lets us flash the right button
  // when there are multiple cards/products on the page.
  const [addedFlashKey, setAddedFlashKey] = useState<string | null>(null);
  const cartCloseRef = useRef<HTMLButtonElement | null>(null);
  const cartTriggerRef = useRef<HTMLElement | null>(null);

  // Booking modal state + refs (Cal.com embed)
  const [bookingOpen, setBookingOpen] = useState(false);
  const bookingCloseRef = useRef<HTMLButtonElement | null>(null);
  const bookingTriggerRef = useRef<HTMLElement | null>(null);

  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const cartSubtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const addToCart = (item: Product, source: "card" | "modal") => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setAddedFlashKey(`${source}:${item.id}`);
    window.setTimeout(() => setAddedFlashKey(null), 1200);
  };
  const openProductModal = (product: Product, triggerEl: HTMLElement) => {
    lastFocusedRef.current = triggerEl;
    setModalProduct(product);
  };
  const closeProductModal = () => setModalProduct(null);
  const updateQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };
  const removeFromCart = (id: string) => setCartItems((prev) => prev.filter((i) => i.id !== id));
  const formatPrice = (product: Product) => {
    const currency = (product.currency ?? "cad").toUpperCase();
    return `${currency}$ ${product.price.toFixed(2)}`;
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({
            priceId: i.priceId,
            name: i.name,
            price: i.price,
            currency: i.currency ?? "cad",
            image: i.image,
            quantity: i.quantity,
          })),
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // fall through to email fallback
    }
    setCheckoutLoading(false);
    const lines = cartItems
      .map((i) => `  - ${i.name} × ${i.quantity}  ($${(i.price * i.quantity).toFixed(2)})`)
      .join("\n");
    window.location.href = `mailto:sombounp@gmail.com?subject=${encodeURIComponent("Order Request")}&body=${encodeURIComponent(`Hello Somboun,\n\nI'd like to place the following order:\n\n${lines}\n\nSubtotal: $${cartSubtotal.toFixed(2)} CAD\n\nThank you!`)}`;
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCfSubmitted(true);
  };

  // Restore cart from localStorage on first load
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sj_cart");
      if (saved) setCartItems(JSON.parse(saved));
    } catch { /* ignore parse errors */ }
    setCartLoaded(true);
  }, []);

  // Persist cart to localStorage whenever it changes (after initial load)
  useEffect(() => {
    if (!cartLoaded) return;
    localStorage.setItem("sj_cart", JSON.stringify(cartItems));
  }, [cartItems, cartLoaded]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Lock body scroll, manage focus, and bind ESC when the product modal is open
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => closeBtnRef.current?.focus());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeProductModal(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
      lastFocusedRef.current?.focus();
    };
  }, [modalOpen]);

  // Auto-open Details + reset carousel to first image whenever the modal opens
  useEffect(() => {
    if (modalOpen) {
      setOpenAccordion("details");
      setModalImageIdx(0);
    }
  }, [modalOpen]);

  // Lock body scroll + manage focus when cart drawer is open
  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => cartCloseRef.current?.focus());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCartOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
      cartTriggerRef.current?.focus();
    };
  }, [cartOpen]);

  // Lock body scroll + manage focus when booking modal is open
  useEffect(() => {
    if (!bookingOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => bookingCloseRef.current?.focus());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBookingOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
      bookingTriggerRef.current?.focus();
    };
  }, [bookingOpen]);

  // Fetch best sellers from Stripe via API route
  useEffect(() => {
    fetch("/api/bestsellers")
      .then((r) => r.json())
      .then((data: Product[]) => {
        if (Array.isArray(data) && data.length > 0) setBestSellers(data);
      })
      .catch(() => {}); // keep fallback on error
  }, []);

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
          <a href="/shop">Shop All</a>
          <a href="#num">NŪM</a>
          <a href="#laser">Laser Skin Care</a>
          <a href={RIMAN_URL} target="_blank" rel="noopener noreferrer sponsored">Riman Skincare</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="icon-row">
          <button
            className="icon-btn icon-btn-cart"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            onClick={(e) => { cartTriggerRef.current = e.currentTarget; setCartOpen(true); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {cartCount > 0 && <span className="cart-badge" aria-hidden="true">{cartCount}</span>}
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
          <a href="/shop" onClick={() => setMenuOpen(false)}>Shop All</a>
          <a href="#num" onClick={() => setMenuOpen(false)}>NŪM</a>
          <a href="#laser" onClick={() => setMenuOpen(false)}>Laser Skin Care</a>
          <a href={RIMAN_URL} target="_blank" rel="noopener noreferrer sponsored" onClick={() => setMenuOpen(false)}>Riman Skincare</a>
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

          <div className="hero-cta-row">
            <a href="/shop" className="book-cta">
              Shop Now <span className="book-cta-icon" aria-hidden="true">→</span>
            </a>
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

          <div className="tx-cta">
            <button
              type="button"
              className="book-cta"
              onClick={(e) => { bookingTriggerRef.current = e.currentTarget; setBookingOpen(true); }}
              aria-haspopup="dialog"
              aria-label="Open booking calendar"
            >
              Book Now <span className="book-cta-icon" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Best Sellers (Stripe-powered) ── */}
      <section id="num" className="ps-section sage-section">
        <div className="ps-inner">
          <div className="ps-intro">
            <div className="ps-eyebrow">BEST-SELLING SKINCARE</div>
            <h2 className="ps-heading">Best Sellers</h2>
            <p className="ps-lede">
              Our top picks across skincare and hair care — curated from our full collection.
            </p>
          </div>
          <div className="ps-grid">
            {bestSellers.map((product) => {
              const cardKey = `card:${product.id}`;
              const brandLabel = getBrand(product.name);
              const productLabel = getProductName(product.name);
              return (
                <div key={product.id} className="ps-card">
                  <div className="ps-card-media">
                    <div
                      className="ps-card-img"
                      style={{ backgroundImage: `url("${product.image}")` }}
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className="ps-card-img-link"
                      onClick={(e) => openProductModal(product, e.currentTarget)}
                      aria-haspopup="dialog"
                      aria-label={`View ${product.name} details`}
                    />
                  </div>
                  <button
                    type="button"
                    className="ps-card-trigger"
                    onClick={(e) => openProductModal(product, e.currentTarget)}
                    aria-haspopup="dialog"
                    aria-label={`View ${product.name} details`}
                  >
                    <div className="ps-card-foot">
                      <div className="ps-card-name">
                        <span className="ps-card-brand">{brandLabel}</span>
                        <span className="ps-card-product">{productLabel || product.name}</span>
                      </div>
                      <div className="ps-card-price">{formatPrice(product)}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`ps-card-cart${addedFlashKey === cardKey ? " is-added" : ""}`}
                    onClick={() => addToCart(product, "card")}
                    aria-label={`Add ${product.name} to cart`}
                  >
                    {addedFlashKey === cardKey ? "Added ✓" : "Add to Cart"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="tx-cta">
            <a href="/shop" className="book-cta book-cta--light">
              Shop All Products <span className="book-cta-icon" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Riman Affiliate ── */}
      <section className="rm-section" aria-labelledby="rm-heading">
        <div className="rm-inner">
          <div className="rm-disclosure">This page contains affiliate links.</div>
          <a
            className="rm-card"
            href={RIMAN_URL}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label="Visit Riman Skincare (opens in new tab)"
          >
            <div className="rm-media">
              <div
                className="rm-img"
                style={{ backgroundImage: 'url("/riman.webp")' }}
                role="img"
                aria-label="Riman Skincare collection"
              />
            </div>
            <div className="rm-body">
              <div className="rm-eyebrow">Featured Partner</div>
              <h3 id="rm-heading" className="rm-heading">Riman Skincare</h3>
              <p className="rm-text">
                Korean clinical skincare grounded in research and ritual. Explore the
                full collection through our partner storefront.
              </p>
              <span className="rm-cta">Shop Riman <span aria-hidden="true">→</span></span>
            </div>
          </a>
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
              <li><a href="/shop">Shop All</a></li>
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
          <div className="right">
            <a className="subfoot-link" href="/privacy-policy">Privacy Policy</a>
            <a className="subfoot-link" href="/accessibility-statement">Accessibility</a>
          </div>
        </div>
      </footer>

      {/* ── Product Detail Modal ── */}
      {modalProduct && (
        <div
          className="pm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pm-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeProductModal(); }}
        >
          <div
            ref={modalPanelRef}
            className="pm-panel"
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.stopPropagation(); closeProductModal(); return; }
              if (e.key !== "Tab") return;
              const f = modalPanelRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );
              if (!f || f.length === 0) return;
              const first = f[0];
              const last = f[f.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <button
              ref={closeBtnRef}
              type="button"
              className="pm-close"
              aria-label="Close product details"
              onClick={closeProductModal}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Left: image carousel */}
            <div className="pm-media">
              <div className="pm-media-frame">
                <div
                  className="pm-media-img"
                  style={{ backgroundImage: `url("${modalProduct.images[modalImageIdx] ?? modalProduct.image}")` }}
                  role="img"
                  aria-label={modalProduct.name}
                />
              </div>
              {/* Dots + arrow navigation — only shown when multiple images exist */}
              {modalProduct.images.length > 1 && (
                <div className="pm-nav-row">
                  <div className="pm-dots" role="group" aria-label="Product image carousel">
                    {modalProduct.images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`pm-dot${i === modalImageIdx ? " is-active" : ""}`}
                        aria-label={`Show image ${i + 1}`}
                        aria-current={i === modalImageIdx}
                        onClick={() => setModalImageIdx(i)}
                      />
                    ))}
                  </div>
                  {/* Arrow buttons — white circles on the right */}
                  <div className="pm-arrows" aria-label="Image navigation">
                    <button
                      type="button"
                      className="pm-arrow"
                      aria-label="Previous image"
                      onClick={() =>
                        setModalImageIdx((i) => (i - 1 + modalProduct.images.length) % modalProduct.images.length)
                      }
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="pm-arrow"
                      aria-label="Next image"
                      onClick={() =>
                        setModalImageIdx((i) => (i + 1) % modalProduct.images.length)
                      }
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: product info */}
            <div className="pm-content">
              <div className="pm-eyebrow">
                {getBrand(modalProduct.name)}{" "}
                <span style={{ opacity: .55 }}>{getProductName(modalProduct.name).toUpperCase()}</span>
              </div>
              <h2 id="pm-title" className="pm-title">{getProductName(modalProduct.name) || modalProduct.name}</h2>
              <div className="pm-price">{formatPrice(modalProduct)}</div>

              <button
                type="button"
                className={`pm-cart${addedFlashKey === `modal:${modalProduct.id}` ? " is-added" : ""}`}
                onClick={() => addToCart(modalProduct, "modal")}
                aria-label={`Add ${modalProduct.name} to cart`}
              >
                {addedFlashKey === `modal:${modalProduct.id}` ? (
                  <>Added to cart <span className="pm-cart-icon" aria-hidden="true">✓</span></>
                ) : (
                  <>Add to Cart <span className="pm-cart-icon" aria-hidden="true">→</span></>
                )}
              </button>

              <div className="pm-accordion">
                <div className={`pm-acc-item${openAccordion === "details" ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="pm-acc-trigger"
                    aria-expanded={openAccordion === "details"}
                    aria-controls="pm-acc-details"
                    onClick={() => setOpenAccordion(openAccordion === "details" ? null : "details")}
                  >
                    <span>Details</span>
                    <span className="pm-acc-icon" aria-hidden="true">{openAccordion === "details" ? "−" : "+"}</span>
                  </button>
                  <div id="pm-acc-details" className="pm-acc-body" role="region">
                    {modalProduct.description
                      ? <p>{modalProduct.description}</p>
                      : <p style={{ color: "var(--muted)", fontStyle: "italic" }}>Product details coming soon. Contact us for more information.</p>
                    }
                    {modalProduct.features && modalProduct.features.length > 0 && (
                      <ul className="pm-acc-list">
                        {modalProduct.features.map((f) => <li key={f}>{f}</li>)}
                      </ul>
                    )}
                  </div>
                </div>

                {modalProduct.ingredients && modalProduct.ingredients.length > 0 && (
                  <div className={`pm-acc-item${openAccordion === "ingredients" ? " is-open" : ""}`}>
                    <button
                      type="button"
                      className="pm-acc-trigger"
                      aria-expanded={openAccordion === "ingredients"}
                      aria-controls="pm-acc-ingredients"
                      onClick={() => setOpenAccordion(openAccordion === "ingredients" ? null : "ingredients")}
                    >
                      <span>Ingredients</span>
                      <span className="pm-acc-icon" aria-hidden="true">{openAccordion === "ingredients" ? "−" : "+"}</span>
                    </button>
                    <div id="pm-acc-ingredients" className="pm-acc-body" role="region">
                      <p className="pm-ing-text">{modalProduct.ingredients.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <>
          <div className="cart-backdrop" onClick={() => setCartOpen(false)} aria-hidden="true" />
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
            <header className="cart-header">
              <h2 className="cart-title">
                Cart
                {cartCount > 0 && <span className="cart-title-count">{cartCount} {cartCount === 1 ? "item" : "items"}</span>}
              </h2>
              <button
                ref={cartCloseRef}
                type="button"
                className="cart-close"
                aria-label="Close cart"
                onClick={() => setCartOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <div className="cart-empty-title">Your cart is empty</div>
                  <div className="cart-empty-text">
                    Add a product to begin. Orders are confirmed by email.
                  </div>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div
                      className="cart-item-thumb"
                      style={{ backgroundImage: `url("${item.image}")` }}
                      role="img"
                      aria-label={item.name}
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">${item.price.toFixed(2)}</div>
                      <div className="cart-qty" role="group" aria-label={`Quantity for ${item.name}`}>
                        <button type="button" aria-label="Decrease quantity" onClick={() => updateQty(item.id, -1)}>−</button>
                        <span className="cart-qty-value" aria-live="polite">{item.quantity}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-item-remove"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => removeFromCart(item.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <footer className="cart-footer">
                <div className="cart-subtotal">
                  <span className="cart-subtotal-label">Subtotal</span>
                  <span className="cart-subtotal-value">${cartSubtotal.toFixed(2)} CAD</span>
                </div>
                <div className="cart-note">Shipping and taxes calculated at checkout.</div>
                <button type="button" className="cart-checkout" onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? "Redirecting…" : "Checkout"}
                </button>
              </footer>
            )}
          </aside>
        </>
      )}

      {/* ── Booking Modal (Cal.com embed) ── */}
      {bookingOpen && (
        <>
          <div className="bk-backdrop" onClick={() => setBookingOpen(false)} aria-hidden="true" />
          <div className="bk-modal" role="dialog" aria-modal="true" aria-label="Book a consultation">
            <button
              ref={bookingCloseRef}
              type="button"
              className="bk-close"
              aria-label="Close booking"
              onClick={() => setBookingOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <iframe
              src={CAL_BOOKING_URL}
              className="bk-iframe"
              title="Book a consultation"
              loading="lazy"
            />
          </div>
        </>
      )}
    </>
  );
}
