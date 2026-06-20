"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/stripe";

const RIMAN_URL =
  "https://mall.riman.com/member-ship/home?referrerCode=4007357701&utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnSzlvjf0O5Yyn99fFymE0Aky-MiXIB-0PzUTIDENClmui_dqi2nUpcTGlGEc_aem_a7CJKao6iWR6PtZ_yXHYNw";

// Brand prefix → [normalised brand label, category]
// Ordered longest-first to prevent partial matches
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
];
const CATEGORIES = ["All", "Hair Care", "Skin Care", "Body Care", "Wellness"];

function getBrand(name: string): string {
  for (const [prefix, brand] of BRAND_MAP) {
    if (name.startsWith(prefix)) return brand;
  }
  return "Other";
}
function getCategory(name: string): string {
  for (const [prefix, , cat] of BRAND_MAP) {
    if (name.startsWith(prefix)) return cat;
  }
  return "Other";
}
function getProductName(name: string): string {
  for (const [prefix] of BRAND_MAP) {
    if (name.startsWith(prefix)) return name.slice(prefix.length).trim();
  }
  return name;
}

type CartItem = Product & { quantity: number };

export default function ShopClient({ products }: { products: Product[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const modalOpen = modalProduct !== null;
  const [openAccordion, setOpenAccordion] = useState<"details" | "ingredients" | null>("details");
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [addedFlashKey, setAddedFlashKey] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const cartCloseRef = useRef<HTMLButtonElement | null>(null);
  const cartTriggerRef = useRef<HTMLElement | null>(null);

  const cartCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const cartSubtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const allBrands = Array.from(new Set(products.map((p) => getBrand(p.name)))).sort();
  const visibleBrands = activeCategory === "All"
    ? allBrands
    : allBrands.filter((b) => {
        const entry = BRAND_MAP.find(([, brand]) => brand === b);
        return entry?.[2] === activeCategory;
      });
  const filteredProducts = products.filter((p) => {
    const brandMatch = activeBrands.length === 0 || activeBrands.includes(getBrand(p.name));
    const catMatch = activeCategory === "All" || getCategory(p.name) === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const searchMatch = !q || p.name.toLowerCase().includes(q);
    return brandMatch && catMatch && searchMatch;
  });

  const toggleBrand = (brand: string) =>
    setActiveBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);

  const hasActiveFilters = activeCategory !== "All" || activeBrands.length > 0 || searchQuery.trim() !== "";
  const clearFilters = () => { setActiveCategory("All"); setActiveBrands([]); setSearchQuery(""); };

  const addToCart = (item: Product, source: "card" | "modal") => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
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
  const removeFromCart = (id: string) =>
    setCartItems((prev) => prev.filter((i) => i.id !== id));

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
            currency: i.currency,
            image: i.image,
            quantity: i.quantity,
          })),
          origin: window.location.origin,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

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

  useEffect(() => {
    if (modalOpen) { setOpenAccordion("details"); setModalImageIdx(0); }
  }, [modalOpen]);

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

  // Detect Stripe success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("order") === "success") {
      setOrderSuccess(true);
      setCartItems([]);
      window.history.replaceState({}, "", "/shop");
    }
  }, []);

  useEffect(() => {
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const formatPrice = (product: Product) => {
    const currency = (product.currency ?? "cad").toUpperCase();
    return `${currency}$ ${product.price.toFixed(2)}`;
  };

  return (
    <>
      {/* ── Header ── */}
      <header className="header">
        <a href="/" className="logo" style={{ textDecoration: "none" }}>Somboun June</a>
        <nav className="nav" aria-label="primary">
          <a href="/shop" aria-current="page">Shop All</a>
          <a href="/#num">NŪM</a>
          <a href="/#laser">Laser Skin Care</a>
          <a href={RIMAN_URL} target="_blank" rel="noopener noreferrer sponsored">Riman Skincare</a>
          <a href="/#contact">Contact</a>
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
        <button
          className={`hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((m) => !m)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </header>

      {/* ── Mobile overlay ── */}
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
          <a href="/#num" onClick={() => setMenuOpen(false)}>NŪM</a>
          <a href="/#laser" onClick={() => setMenuOpen(false)}>Laser Skin Care</a>
          <a href={RIMAN_URL} target="_blank" rel="noopener noreferrer sponsored" onClick={() => setMenuOpen(false)}>Riman Skincare</a>
          <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
      </div>

      {/* ── Order success banner ── */}
      {orderSuccess && (
        <div className="shop-success" role="alert">
          <span>Order placed — check your email for a confirmation receipt.</span>
          <button type="button" onClick={() => setOrderSuccess(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Shop Main ── */}
      <main className="shop-main">
        <div className="shop-wrap">

          {/* Editorial header */}
          <div className="shop-header">
            <div className="shop-eyebrow">Somboun June</div>
            <h1 className="shop-h1">
              {activeBrands.length === 1 ? (
                activeBrands[0]
              ) : activeCategory !== "All" ? (
                activeCategory
              ) : (
                <>Shop<span className="shop-h1-sub">All Products</span></>
              )}
            </h1>
          </div>

          <div className="shop-rule" aria-hidden="true" />

          {/* Sidebar + Grid */}
          <div className="shop-layout">

            {/* Sidebar */}
            <aside className="shop-sidebar">
              <div className="shop-filter-box">
                <div className="shop-filter-box-head">
                  <span className="shop-filter-box-title">Filters</span>
                  {hasActiveFilters && (
                    <button className="shop-filter-clear" onClick={clearFilters}>Clear all</button>
                  )}
                </div>

                <input
                  className="shop-search"
                  type="search"
                  placeholder="Search products…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search products"
                />

                <div className="shop-filter-section">
                  <div className="shop-filter-label">Category</div>
                  {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                    <label key={cat} className="shop-cb-row">
                      <span className={`shop-cb${activeCategory === cat ? " is-checked" : ""}`} aria-hidden="true" />
                      <input
                        type="radio" name="category" value={cat}
                        checked={activeCategory === cat}
                        onChange={() => { setActiveCategory(cat); setActiveBrands([]); }}
                        className="shop-cb-input" tabIndex={-1}
                      />
                      {cat}
                    </label>
                  ))}
                  {activeCategory !== "All" && (
                    <label className="shop-cb-row shop-cb-row--muted">
                      <span className="shop-cb" aria-hidden="true" />
                      <input type="radio" name="category" value="All" checked={false}
                        onChange={() => { setActiveCategory("All"); setActiveBrands([]); }}
                        className="shop-cb-input" tabIndex={-1}
                      />
                      Show all
                    </label>
                  )}
                </div>

                <div className="shop-filter-section">
                  <div className="shop-filter-label">Brand</div>
                  <div className="shop-filter-brand-list">
                    {visibleBrands.map((brand) => (
                      <label key={brand} className="shop-cb-row">
                        <span className={`shop-cb${activeBrands.includes(brand) ? " is-checked" : ""}`} aria-hidden="true" />
                        <input
                          type="checkbox" value={brand}
                          checked={activeBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="shop-cb-input" tabIndex={-1}
                        />
                        {brand}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <div className="shop-grid-col">
              <div className="shop-result-count" aria-live="polite" style={{ marginBottom: "20px" }}>
                {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
              </div>
              <div className="shop-grid" aria-label="Products">
              {filteredProducts.map((product) => {
              const cardKey = `card:${product.id}`;
              return (
                <div key={product.id} className="ps-card">
                  <div className="ps-card-media">
                    <div
                      className="ps-card-img"
                      style={{
                        backgroundImage: `url("${product.image}")`,
                        backgroundPosition: product.id === "num-face-tallow" ? "center 40%" : "center",
                      }}
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
                        <span className="ps-card-brand">{getBrand(product.name)}</span>
                        <span className="ps-card-product">{getProductName(product.name)}</span>
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
            </div>
          </div>{/* end shop-layout */}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">Somboun June</div>
            <p className="footer-blurb">
              We are dedicated to helping you feel confident in your own skin. Our treatments focus on enhancing your natural beauty, restoring radiance, and gently improving skin health from the inside out.
            </p>
            <div className="footer-ctas">
              <a className="footer-cta" href="/shop">Shop All <span>→</span></a>
              <a className="footer-cta" href="/#contact">Contact Us <span>→</span></a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Navigate</h4>
            <ul>
              <li><a href="/shop">Shop All</a></li>
              <li><a href="/#num">NŪM</a></li>
              <li><a href="/#laser">Laser Skin Care</a></li>
              <li><a href="/#contact">Contact</a></li>
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
          <a className="subfoot-link" href="/privacy-policy">Privacy Policy</a>
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
              const first = f[0]; const last = f[f.length - 1];
              if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
              else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }}
          >
            <button ref={closeBtnRef} type="button" className="pm-close" aria-label="Close product details" onClick={closeProductModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="pm-media">
              <div className="pm-media-frame">
                <div
                  className="pm-media-img"
                  style={{ backgroundImage: `url("${modalProduct.images[modalImageIdx] ?? modalProduct.image}")` }}
                  role="img"
                  aria-label={modalProduct.name}
                />
              </div>
              {modalProduct.images.length > 1 && (
                <div className="pm-nav-row">
                  <div className="pm-dots" role="group" aria-label="Product image carousel">
                    {modalProduct.images.map((_, i) => (
                      <button key={i} type="button" className={`pm-dot${i === modalImageIdx ? " is-active" : ""}`}
                        aria-label={`Show image ${i + 1}`} aria-current={i === modalImageIdx}
                        onClick={() => setModalImageIdx(i)} />
                    ))}
                  </div>
                  <div className="pm-arrows" aria-label="Image navigation">
                    <button type="button" className="pm-arrow" aria-label="Previous image"
                      onClick={() => setModalImageIdx((i) => (i - 1 + modalProduct.images.length) % modalProduct.images.length)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button type="button" className="pm-arrow" aria-label="Next image"
                      onClick={() => setModalImageIdx((i) => (i + 1) % modalProduct.images.length)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pm-content">
              <div className="pm-eyebrow">
                {getBrand(modalProduct.name)} <span style={{ opacity: .55 }}>{getProductName(modalProduct.name).toUpperCase()}</span>
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
                  <button type="button" className="pm-acc-trigger"
                    aria-expanded={openAccordion === "details"} aria-controls="pm-acc-details"
                    onClick={() => setOpenAccordion(openAccordion === "details" ? null : "details")}>
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
                    <button type="button" className="pm-acc-trigger"
                      aria-expanded={openAccordion === "ingredients"} aria-controls="pm-acc-ingredients"
                      onClick={() => setOpenAccordion(openAccordion === "ingredients" ? null : "ingredients")}>
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
              <button ref={cartCloseRef} type="button" className="cart-close" aria-label="Close cart" onClick={() => setCartOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <div className="cart-empty-title">Your cart is empty</div>
                  <div className="cart-empty-text">Add a product to begin. Orders are confirmed by email.</div>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-thumb" style={{ backgroundImage: `url("${item.image}")` }} role="img" aria-label={item.name} />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">${item.price.toFixed(2)}</div>
                      <div className="cart-qty" role="group" aria-label={`Quantity for ${item.name}`}>
                        <button type="button" aria-label="Decrease quantity" onClick={() => updateQty(item.id, -1)}>−</button>
                        <span className="cart-qty-value" aria-live="polite">{item.quantity}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                    <button type="button" className="cart-item-remove" aria-label={`Remove ${item.name} from cart`} onClick={() => removeFromCart(item.id)}>
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
                <button
                  type="button"
                  className="cart-checkout"
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? "Redirecting to checkout…" : "Checkout"}
                </button>
              </footer>
            )}
          </aside>
        </>
      )}
    </>
  );
}
