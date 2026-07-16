"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Product } from "@/lib/stripe";
import { useCart } from "@/context/CartContext";
import { parseDetails, parseIngredients } from "@/lib/productText";

const RIMAN_URL =
  "https://mall.riman.com/member-ship/home?referrerCode=4007357701&utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQPOTM2NjE5NzQzMzkyNDU5AAGnSzlvjf0O5Yyn99fFymE0Aky-MiXIB-0PzUTIDENClmui_dqi2nUpcTGlGEc_aem_a7CJKao6iWR6PtZ_yXHYNw";

// Brand prefix → [normalised brand label, category]
// Ordered longest-first to prevent partial matches
const BRAND_MAP: [string, string, string][] = [
  ["Schwarzkopf Professional", "Schwarzkopf Professional", "Hair Care"],
  ["Kevin.Murphy + Color.Me", "Kevin Murphy", "Hair Care"],
  ["Kevin.Murphy", "Kevin Murphy", "Hair Care"],
  ["Kevin Murphy", "Kevin Murphy", "Hair Care"],
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
// Categories rendered as oversized "Featured" tiles on the landing.
const FEATURED_CATEGORIES = ["Styling", "Shampoo", "Treatments & Masks"];

// Sentinel for the "Shop All" tile / view (browse the whole catalogue).
const ALL_VIEW = "__all__";

// Case-insensitive prefix test, so "Kevin Murphy", "kevin murphy" and
// "KEVIN.MURPHY" all match the same brand regardless of how Stripe capitalises
// the product name. (Matched length == prefix length, so slicing stays valid.)
function matchesPrefix(name: string, prefix: string): boolean {
  return name.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase();
}
function getBrand(name: string): string {
  for (const [prefix, brand] of BRAND_MAP) {
    if (matchesPrefix(name, prefix)) return brand;
  }
  return "Other";
}
function getCategory(name: string): string {
  for (const [prefix, , cat] of BRAND_MAP) {
    if (matchesPrefix(name, prefix)) return cat;
  }
  return "Other";
}
function getProductName(name: string): string {
  for (const [prefix] of BRAND_MAP) {
    if (matchesPrefix(name, prefix)) return name.slice(prefix.length).trim();
  }
  return name;
}

// Simple product-type category from the product name, using the brand's macro
// category to disambiguate overlaps (a hair "cream" is Styling, a skin "cream"
// is a Moisturizer). Anything that doesn't match falls into "Other".
function getType(name: string): string {
  const n = name.toLowerCase();
  const macro = getCategory(name);
  if (/\bspf\b|sunscreen/.test(n)) return "SPF & Sun";
  if (/body wash|body tallow|\bbody\b/.test(n)) return "Body";
  if (/cleanser|cleansing/.test(n)) return "Cleansers";
  if (/\btoner\b/.test(n)) return "Toners";
  if (macro === "Wellness") return "Wellness";
  if (/shampoo/.test(n) || (macro === "Hair Care" && /\bwash\b/.test(n))) return "Shampoo";
  if (/conditioner|\brinse\b/.test(n)) return "Conditioner";
  if (/treatment|mask|masque/.test(n)) return "Treatments & Masks";
  if (/\boil\b|serum/.test(n)) return "Oils & Serums";
  if (macro === "Skin Care") {
    if (/cream|cr[eè]me|emulsion|moistur|tallow|\bbb\b|essence|retinol|vitamin/.test(n)) return "Moisturizers";
    return "Other";
  }
  if (macro === "Hair Care") return "Styling";
  if (/tallow|cream|cr[eè]me/.test(n)) return "Moisturizers";
  return "Other";
}

// Sort best sellers first: featured, then lowest rank.
const bestSort = (a: Product, b: Product) =>
  a.featured !== b.featured ? (a.featured ? -1 : 1) : (a.rank ?? 999) - (b.rank ?? 999);

// Levenshtein edit distance, for typo-tolerant ("did you mean") matching.
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// Score a product against query tokens across name / brand / ingredients /
// features / description. Lower = better match; null = no match. Exact and
// substring hits beat fuzzy ones, and earlier fields outrank later ones, so
// a name match ranks above an ingredient match (e.g. "beef tallow" → NŪM).
function searchScore(p: Product, tokens: string[]): number | null {
  const fields: { text: string; weight: number; fuzzy: boolean }[] = [
    { text: getProductName(p.name).toLowerCase(), weight: 0, fuzzy: true },
    { text: getBrand(p.name).toLowerCase(), weight: 1, fuzzy: true },
    { text: (p.ingredients ?? []).join(" ").toLowerCase(), weight: 2, fuzzy: true },
    { text: (p.features ?? []).join(" ").toLowerCase(), weight: 3, fuzzy: false },
    { text: (p.description ?? "").toLowerCase(), weight: 4, fuzzy: false },
  ];
  let total = 0;
  for (const token of tokens) {
    let best = Infinity;
    for (const f of fields) {
      if (!f.text) continue;
      if (f.text.includes(token)) { best = Math.min(best, f.weight); continue; }
      if (f.fuzzy && token.length >= 3) {
        const tol = token.length <= 4 ? 1 : 2;
        for (const w of f.text.split(/[^a-z0-9]+/)) {
          if (!w || Math.abs(w.length - token.length) > tol) continue;
          if (editDistance(w, token) <= tol) { best = Math.min(best, f.weight + 5); break; }
        }
      }
    }
    if (best === Infinity) return null; // a token matched nothing → drop product
    total += best;
  }
  return total;
}

const PRICE_BUCKETS: { id: string; label: string; test: (p: number) => boolean }[] = [
  { id: "0-25", label: "Under $25", test: (p) => p < 25 },
  { id: "25-50", label: "$25 – $50", test: (p) => p >= 25 && p < 50 },
  { id: "50-100", label: "$50 – $100", test: (p) => p >= 50 && p < 100 },
  { id: "100+", label: "$100+", test: (p) => p >= 100 },
];
const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "name", label: "Name: A–Z" },
] as const;
type SortId = (typeof SORT_OPTIONS)[number]["id"];

const TRENDING = ["Olaplex", "K18", "Kevin.Murphy", "Shampoo", "Tallow", "Serum"];

// Collapsible section inside the filter drawer.
function FilterSection({
  title, open, onToggle, children,
}: {
  title: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className={`filter-section${open ? " is-open" : ""}`}>
      <button type="button" className="filter-section-head" aria-expanded={open} onClick={onToggle}>
        <span>{title}</span>
        <svg className="filter-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="filter-section-body">{children}</div>}
    </div>
  );
}

export default function ShopClient({ products }: { products: Product[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const modalOpen = modalProduct !== null;
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [modalImageIdx, setModalImageIdx] = useState(0);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  const { cartItems, cartCount, cartSubtotal, addedFlashKey, checkoutLoading, setCheckoutLoading, addToCart, removeFromCart, updateQty, clearCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [sortBy, setSortBy] = useState<SortId>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceBucket, setPriceBucket] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showFilterPill, setShowFilterPill] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ category: true });
  const toggleSection = (k: string) => setOpenSections((s) => ({ ...s, [k]: !s[k] }));
  const cartCloseRef = useRef<HTMLButtonElement | null>(null);
  const cartTriggerRef = useRef<HTMLElement | null>(null);

  // Brands are still shown on cards and offered as a filter inside "Shop All".
  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => getBrand(p.name)))).sort(),
    [products],
  );
  // Categories present in the catalogue, ordered by product count (biggest
  // first), with "Other" pinned to the end.
  const allCategories = useMemo(() => {
    const count: Record<string, number> = {};
    products.forEach((p) => { const t = getType(p.name); count[t] = (count[t] ?? 0) + 1; });
    return Object.keys(count).sort((a, b) =>
      a === "Other" ? 1 : b === "Other" ? -1 : count[b] - count[a]);
  }, [products]);

  // Ordered tiles for the landing: "Shop All" + featured categories are big
  // tiles (alternating sides, spaced through the rest so they don't stack).
  const categoryTiles = useMemo(() => {
    const featured = FEATURED_CATEGORIES.filter((c) => allCategories.includes(c));
    const rest = allCategories.filter((c) => !featured.includes(c));
    const bigs = [ALL_VIEW, ...featured];
    const per = rest.length ? Math.ceil(rest.length / bigs.length) : 0;
    const tiles: { cat: string; big: boolean; side: "left" | "right"; all: boolean }[] = [];
    bigs.forEach((c, i) => {
      tiles.push({ cat: c, big: true, side: i % 2 === 0 ? "left" : "right", all: c === ALL_VIEW });
      rest.slice(i * per, (i + 1) * per).forEach((r) =>
        tiles.push({ cat: r, big: false, side: "left", all: false }));
    });
    rest.slice(per * bigs.length).forEach((r) =>
      tiles.push({ cat: r, big: false, side: "left", all: false }));
    return tiles;
  }, [allCategories]);

  // Category cover = the image of that category's best seller.
  const categoryCovers = useMemo(() => {
    const byCat: Record<string, Product[]> = {};
    products.forEach((p) => { (byCat[getType(p.name)] ??= []).push(p); });
    const covers: Record<string, string> = {};
    Object.entries(byCat).forEach(([cat, list]) => {
      const best = [...list].sort(bestSort)[0];
      if (best) covers[cat] = best.image;
    });
    return covers;
  }, [products]);

  // Cover for the "Shop All" tile: the single best seller across the catalogue.
  const overallCover = useMemo(() => [...products].sort(bestSort)[0]?.image ?? "", [products]);
  const bucket = PRICE_BUCKETS.find((b) => b.id === priceBucket);
  const isAll = selectedCategory === ALL_VIEW;
  // A single category shows only its best 10 products; "Shop All" shows all.
  const baseProducts = useMemo(() => {
    if (selectedCategory && selectedCategory !== ALL_VIEW) {
      return products.filter((p) => getType(p.name) === selectedCategory).sort(bestSort).slice(0, 10);
    }
    return products;
  }, [products, selectedCategory]);
  const filteredProducts = baseProducts.filter((p) => {
    const catMatch = !isAll || activeCats.length === 0 || activeCats.includes(getType(p.name));
    const brandMatch = !isAll || activeBrands.length === 0 || activeBrands.includes(getBrand(p.name));
    const stockMatch = !inStockOnly || p.stock === undefined || p.stock > 0;
    const priceMatch = !bucket || bucket.test(p.price);
    return catMatch && brandMatch && stockMatch && priceMatch;
  });
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "name") return getProductName(a.name).localeCompare(getProductName(b.name));
    return 0;
  });

  // Search is a standalone discovery popup (it doesn't filter the grid):
  // empty query → featured recommendations; otherwise → name matches.
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...products]
        .sort((a, b) => (a.featured !== b.featured ? (a.featured ? -1 : 1) : (a.rank ?? 999) - (b.rank ?? 999)))
        .slice(0, 8);
    }
    const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return products
      .map((p) => ({ p, score: searchScore(p, tokens) }))
      .filter((x): x is { p: Product; score: number } => x.score !== null)
      .sort((a, b) =>
        a.score - b.score ||
        (a.p.featured !== b.p.featured ? (a.p.featured ? -1 : 1) : (a.p.rank ?? 999) - (b.p.rank ?? 999)))
      .slice(0, 12)
      .map((x) => x.p);
  })();

  const toggleBrand = (brand: string) =>
    setActiveBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  const toggleCat = (cat: string) =>
    setActiveCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  const resetFilters = () => {
    setInStockOnly(false); setPriceBucket(null); setSortBy("featured");
  };
  // Category & Brand are real (multi-select) filters only in "Shop All"; inside
  // a single category the category is the fixed page context, not a filter.
  const activeFilterCount =
    (isAll ? activeCats.length + activeBrands.length : 0) +
    (inStockOnly ? 1 : 0) +
    (priceBucket ? 1 : 0) +
    (sortBy !== "featured" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const clearFilters = () => {
    resetFilters();
    if (isAll) { setActiveCats([]); setActiveBrands([]); }
  };
  const selectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setActiveCats([]); setActiveBrands([]); resetFilters();
    window.history.pushState({}, "", `/shop?category=${encodeURIComponent(cat)}`);
    window.scrollTo({ top: 0 });
  };
  const backToCategories = () => {
    setSelectedCategory(null);
    setActiveCats([]); setActiveBrands([]); resetFilters();
    window.history.pushState({}, "", "/shop");
    window.scrollTo({ top: 0 });
  };
  const selectAll = () => {
    setSelectedCategory(ALL_VIEW);
    setActiveCats([]); setActiveBrands([]); resetFilters();
    window.history.pushState({}, "", "/shop?view=all");
    window.scrollTo({ top: 0 });
  };

  // Reset visible count when the view or filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedCategory, activeCats, activeBrands, sortBy, inStockOnly, priceBucket]);

  const visibleProducts = sortedProducts.slice(0, visibleCount);
  const hasMore = visibleCount < sortedProducts.length;

  const openProductModal = (product: Product, triggerEl: HTMLElement) => {
    lastFocusedRef.current = triggerEl;
    setModalProduct(product);
  };
  const closeProductModal = () => setModalProduct(null);

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
    document.body.style.overflow = filterOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filterOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [searchOpen]);

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
    if (modalOpen) { setDetailsOpen(true); setIngredientsOpen(false); setModalImageIdx(0); }
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
      clearCart();
      window.history.replaceState({}, "", "/shop");
    }
  }, [clearCart]);

  useEffect(() => {
    const header = document.querySelector(".header");
    let lastY = 0;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          header?.classList.toggle("scrolled", y > 40);
          setShowFilterPill(y > 280);
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

  // Sync the view with the URL (?view=all or ?category=) for deep links + nav.
  useEffect(() => {
    const readView = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "all") { setSelectedCategory(ALL_VIEW); return; }
      const c = params.get("category");
      setSelectedCategory(c && allCategories.includes(c) ? c : null);
    };
    readView();
    window.addEventListener("popstate", readView);
    return () => window.removeEventListener("popstate", readView);
  }, [allCategories]);

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
            className="icon-btn"
            aria-label="Search products"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((s) => !s)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" />
            </svg>
          </button>
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

      {/* ── Search overlay (full-screen popup with recommendations) ── */}
      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search products">
          <button type="button" className="search-overlay-close" onClick={() => setSearchOpen(false)} aria-label="Close search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
          <div className="search-overlay-inner">
            <div className="search-overlay-logo">Somboun June</div>

            <div className="search-field">
              <svg className="search-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" />
              </svg>
              <input
                className="search-field-input"
                type="search"
                autoFocus
                placeholder="Search products, brands, ingredients…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
              />
              {searchQuery && (
                <button type="button" className="search-field-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            <div className="search-trending">
              <span className="search-trending-label">Trending Searches</span>
              {TRENDING.map((t) => (
                <button key={t} type="button" className="search-trending-term" onClick={() => setSearchQuery(t)}>{t}</button>
              ))}
            </div>

            <div className="search-results">
              <div className="search-results-head">{searchQuery.trim() ? "Results" : "Popular Right Now"}</div>
              {searchResults.length === 0 ? (
                <p className="search-empty">No products match “{searchQuery.trim()}”.</p>
              ) : (
                <div className="search-rec-row">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="search-rec-card"
                      onClick={(e) => { const t = e.currentTarget; setSearchOpen(false); openProductModal(p, t); }}
                    >
                      <div className="search-rec-img" style={{ backgroundImage: `url("${p.image}")` }} aria-hidden="true" />
                      <div className="search-rec-brand">{getBrand(p.name)}</div>
                      <div className="search-rec-name">{getProductName(p.name)}</div>
                      <div className="search-rec-price">{formatPrice(p)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            {selectedCategory && (
              <button type="button" className="shop-back" onClick={backToCategories}>
                <span aria-hidden="true">←</span> All Categories
              </button>
            )}
            <div className="shop-eyebrow">Somboun June</div>
            <h1 className="shop-h1">
              {selectedCategory ? (
                selectedCategory === ALL_VIEW ? "All Products" : selectedCategory
              ) : (
                <>Shop<span className="shop-h1-sub">by Category</span></>
              )}
            </h1>
          </div>

          <div className="shop-rule" aria-hidden="true" />

          {selectedCategory ? (
          /* Selected category -> product grid */
          <div className="shop-layout">

            {/* Product Grid */}
            <div className="shop-grid-col">
              <div className="shop-result-count" aria-live="polite" style={{ marginBottom: "20px" }}>
                {hasMore
                  ? `Showing ${visibleProducts.length} of ${filteredProducts.length} products`
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`
                }
              </div>
              <div className="shop-grid" aria-label="Products">
              {visibleProducts.map((product) => {
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
                    {product.stock !== undefined && product.stock <= 0 ? (
                      <span className="ps-card-soldout">Sold Out</span>
                    ) : (
                      <button
                        type="button"
                        className={`ps-card-quickadd${addedFlashKey === cardKey ? " is-added" : ""}`}
                        onClick={() => addToCart(product, "card")}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        {addedFlashKey === cardKey ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        )}
                      </button>
                    )}
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
                </div>
              );
            })}
              </div>
              {hasMore && (
                <div className="shop-load-more">
                  <button
                    type="button"
                    className="book-cta book-cta--light"
                    onClick={() => setVisibleCount((n) => n + 20)}
                  >
                    Load More Products <span className="book-cta-icon" aria-hidden="true">↓</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="brand-grid" aria-label="Categories">
              {categoryTiles.map((t) => {
                const cover = t.all ? overallCover : categoryCovers[t.cat];
                return (
                <button
                  key={t.cat}
                  type="button"
                  className={`brand-tile${t.big ? ` brand-tile--big is-${t.side}` : ""}${t.all ? " brand-tile--all" : ""}`}
                  onClick={() => (t.all ? selectAll() : selectCategory(t.cat))}
                  aria-label={t.all ? "View all products" : `View ${t.cat} products`}
                >
                  <div
                    className="brand-tile-img"
                    style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
                    aria-hidden="true"
                  />
                  <div className="brand-tile-foot">
                    {t.big && <span className="brand-tile-kicker">{t.all ? "Everything" : "Featured"}</span>}
                    <span className="brand-tile-name">{t.all ? "Shop All" : t.cat}</span>
                  </div>
                </button>
                );
              })}
            </div>
          )}
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

      {/* ── Filters & Sort (floating pill + drawer) ── */}
      <button
        type="button"
        className={`filter-fab${selectedCategory && showFilterPill && !filterOpen ? " is-visible" : ""}`}
        onClick={() => setFilterOpen(true)}
        aria-haspopup="dialog"
        aria-label="Open filters and sort"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="4" y1="7" x2="14" y2="7" /><line x1="18" y1="7" x2="20" y2="7" /><circle cx="16" cy="7" r="2" />
          <line x1="4" y1="12" x2="8" y2="12" /><line x1="12" y1="12" x2="20" y2="12" /><circle cx="10" cy="12" r="2" />
          <line x1="4" y1="17" x2="12" y2="17" /><line x1="16" y1="17" x2="20" y2="17" /><circle cx="14" cy="17" r="2" />
        </svg>
        Filters &amp; Sort by
        {activeFilterCount > 0 && <span className="filter-fab-count">{activeFilterCount}</span>}
      </button>

      {filterOpen && (
        <div className="filter-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFilterOpen(false); }}>
          <aside className="filter-drawer" role="dialog" aria-modal="true" aria-label="Filter and sort products">
            <header className="filter-drawer-head">
              <h2 className="filter-drawer-title">Filter by</h2>
              <button type="button" className="filter-drawer-close" onClick={() => setFilterOpen(false)} aria-label="Close filters">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="filter-drawer-body">
              <div className="filter-toggles">
                <div className="filter-toggle-row">
                  <span>In Stock</span>
                  <button
                    type="button" role="switch" aria-checked={inStockOnly}
                    className={`filter-switch${inStockOnly ? " is-on" : ""}`}
                    onClick={() => setInStockOnly((v) => !v)}
                    aria-label="Show in-stock products only"
                  >
                    <span className="filter-switch-knob" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isAll && (
                <FilterSection title="Category" open={!!openSections.category} onToggle={() => toggleSection("category")}>
                  {allCategories.map((cat) => (
                    <button key={cat} type="button" className="filter-opt" onClick={() => toggleCat(cat)}>
                      <span className={`filter-cb${activeCats.includes(cat) ? " is-checked" : ""}`} aria-hidden="true" />
                      {cat}
                    </button>
                  ))}
                </FilterSection>
              )}

              {isAll && (
                <FilterSection title="Brand" open={!!openSections.brand} onToggle={() => toggleSection("brand")}>
                  {allBrands.map((brand) => (
                    <button key={brand} type="button" className="filter-opt" onClick={() => toggleBrand(brand)}>
                      <span className={`filter-cb${activeBrands.includes(brand) ? " is-checked" : ""}`} aria-hidden="true" />
                      {brand}
                    </button>
                  ))}
                </FilterSection>
              )}

              <FilterSection title="Price Range" open={!!openSections.price} onToggle={() => toggleSection("price")}>
                {PRICE_BUCKETS.map((b) => (
                  <button key={b.id} type="button" className="filter-opt"
                    onClick={() => setPriceBucket(priceBucket === b.id ? null : b.id)}>
                    <span className={`filter-cb${priceBucket === b.id ? " is-checked" : ""}`} aria-hidden="true" />
                    {b.label}
                  </button>
                ))}
              </FilterSection>

              <FilterSection title="Sort by" open={!!openSections.sort} onToggle={() => toggleSection("sort")}>
                {SORT_OPTIONS.map((o) => (
                  <button key={o.id} type="button" className="filter-opt" onClick={() => setSortBy(o.id)}>
                    <span className={`filter-radio${sortBy === o.id ? " is-checked" : ""}`} aria-hidden="true" />
                    {o.label}
                  </button>
                ))}
              </FilterSection>
            </div>

            <footer className="filter-drawer-foot">
              {hasActiveFilters && (
                <button type="button" className="filter-clear" onClick={clearFilters}>Clear all</button>
              )}
              <button type="button" className="filter-show" onClick={() => setFilterOpen(false)}>
                Show {sortedProducts.length} {sortedProducts.length === 1 ? "Product" : "Products"}
              </button>
            </footer>
          </aside>
        </div>
      )}

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

              {modalProduct.stock !== undefined && modalProduct.stock <= 0 ? (
                <button type="button" className="pm-cart" disabled aria-label={`${modalProduct.name} is sold out`}>
                  Sold Out
                </button>
              ) : (
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
              )}

              <div className="pm-accordion">
                <div className={`pm-acc-item${detailsOpen ? " is-open" : ""}`}>
                  <button type="button" className="pm-acc-trigger"
                    aria-expanded={detailsOpen} aria-controls="pm-acc-details"
                    onClick={() => setDetailsOpen((o) => !o)}>
                    <span>Details</span>
                    <span className="pm-acc-icon" aria-hidden="true">{detailsOpen ? "−" : "+"}</span>
                  </button>
                  <div id="pm-acc-details" className="pm-acc-body" role="region">
                    {(() => {
                      const { paragraphs, bullets } = parseDetails(modalProduct.description, modalProduct.features);
                      if (paragraphs.length === 0 && bullets.length === 0) {
                        return <p style={{ color: "var(--muted)", fontStyle: "italic" }}>Product details coming soon. Contact us for more information.</p>;
                      }
                      return (
                        <>
                          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                          {bullets.length > 0 && (
                            <ul className="pm-acc-list">
                              {bullets.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {modalProduct.ingredients && modalProduct.ingredients.length > 0 && (
                  <div className={`pm-acc-item${ingredientsOpen ? " is-open" : ""}`}>
                    <button type="button" className="pm-acc-trigger"
                      aria-expanded={ingredientsOpen} aria-controls="pm-acc-ingredients"
                      onClick={() => setIngredientsOpen((o) => !o)}>
                      <span>Ingredients</span>
                      <span className="pm-acc-icon" aria-hidden="true">{ingredientsOpen ? "−" : "+"}</span>
                    </button>
                    <div id="pm-acc-ingredients" className="pm-acc-body" role="region">
                      <p className="pm-ing-text">{parseIngredients(modalProduct.ingredients).join(", ")}</p>
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
