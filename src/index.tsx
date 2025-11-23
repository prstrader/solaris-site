import React, { useEffect, useMemo, useRef, useState } from "react";

/*********************
 * Solaris E‑business demo app (full site)
 * - Domain: solaris.fit
 * - Images from /public/images
 * - Cart auto-bundle + free shipping at $100
 * - Pages: Shop, About, Contact, FAQ, Testimonials, Español, Privacy, Terms
 * - Social icons: Twitter, Facebook, Instagram, Pinterest
 * - Video: poster + dual source paths
 *********************/

// ---- Company/domain ----
const COMPANY = {
  domain: "solaris.fit",
  emailSupport: "support@solaris.fit",
  emailWebmaster: "webmaster@solaris.fit",
  baseUrl: "https://solaris.fit",
};

// ---- Brand theme ----
const BRAND = {
  colors: {
    primary: "#1c2d7a",
    accent: "#4867d9",
    gold: "#dbb674",
    surface: "#f7f7f5",
    text: "#000000",
  },
  fonts: {
    body: "Arial, system-ui, sans-serif",
    headings: "Georgia, 'Times New Roman', serif",
  },
};

function BrandStyles() {
  const { colors, fonts } = BRAND;
  const css = `:root { --brand-primary:${colors.primary};--brand-accent:${colors.accent};--brand-gold:${colors.gold};--brand-surface:${colors.surface};--brand-text:${colors.text}; }
  body{background:var(--brand-surface);color:var(--brand-text);font-family:${fonts.body}}
  .brand-heading{font-family:${fonts.headings}}
  .brand-btn{background:var(--brand-primary);color:#fff;border-radius:1rem;padding:.5rem .9rem}
  .brand-badge{display:inline-block;background:var(--brand-gold);color:#000;border-radius:.6rem;padding:.15rem .5rem;font-size:.75rem}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

// ---- Resilient image loader ----
function ImageSafe({ srcs, alt, className }) {
  const [idx, setIdx] = useState(0);
  const src = srcs[Math.min(idx, srcs.length - 1)];
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setIdx((i) => (i + 1 < srcs.length ? i + 1 : i))}
    />
  );
}

// ---- Catalog ----
const PRODUCTS = [
  {
    id: "sg1",
    name: "Solaris Signature Sunglasses",
    price: 85.0,
    defaultUrls: ["/images/glasses.jpg"],
    tagline: "Luxury vision redefined",
    description:
      "Premium Solaris sunglasses featuring lightweight frames with removable magnetic lenses for versatile style and all day comfort. One size sport fit (medium Large), TR90 lightweight frame, polarized UV400 lenses.",
  },
  {
    id: "ln1",
    name: "Solaris Alternate Lenses",
    price: 25.0,
    defaultUrls: ["/images/lenses.jpg"],
    tagline: "Swap and shine",
    description:
      "A second set of high quality interchangeable lenses to match your Solaris frames; pop them in or out instantly for different looks. Fits all Solaris frames, shatter resistant polycarbonate, available in multiple tints and polarizations.",
  },
  {
    id: "bd1",
    name: "Solaris Bundle (Sunglasses + Lenses)",
    price: 100.0,
    defaultUrls: ["/images/bundle.jpg"],
    tagline: "Best value: save $10",
    description:
      "Complete Solaris set including one pair of signature frames and two pairs of removable magnetic lenses for day and night wear. Includes one Solaris frame plus two lens sets, same one size sport fit and polarized UV400 protection.",
  },
];

const CATALOG = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// ---- Currency helpers ----
const FX = { MXN: 18.0, EUR: 0.92 };
const two = (n) => n.toFixed(2);
const priceLine = (usd) => `$${two(usd)} USD • $${two(usd * FX.MXN)} MXN • €${two(usd * FX.EUR)} EUR`;

// ---- Cart with auto-bundle + totals ----
function useCart() {
  const [items, setItems] = useState([]); // [{id,name,price,qty}]
  const [autoBundled, setAutoBundled] = useState(false);

  const merge = (list) => {
    const m = {};
    list.forEach((i) => {
      if (!m[i.id]) m[i.id] = { ...i };
      else m[i.id].qty += i.qty;
    });
    return Object.values(m);
  };

  const normalize = (list) => {
    // convert sunglasses + lenses pairs into bundle units
    const counts = { sg1: 0, ln1: 0, bd1: 0 };
    list.forEach((i) => {
      if (counts[i.id] !== undefined) counts[i.id] += i.qty;
    });
    const pairs = Math.min(counts.sg1, counts.ln1);
    if (pairs > 0) {
      counts.sg1 -= pairs;
      counts.ln1 -= pairs;
      counts.bd1 += pairs;
    }
    const out = [];
    if (counts.sg1) out.push({ id: "sg1", name: CATALOG.sg1.name, price: CATALOG.sg1.price, qty: counts.sg1 });
    if (counts.ln1) out.push({ id: "ln1", name: CATALOG.ln1.name, price: CATALOG.ln1.price, qty: counts.ln1 });
    if (counts.bd1) out.push({ id: "bd1", name: CATALOG.bd1.name, price: CATALOG.bd1.price, qty: counts.bd1 });
    return merge(out);
  };

  const safeSet = (updater) => {
    setItems((prev) => {
      const before = typeof updater === "function" ? updater(prev) : updater;
      const beforeCounts = prev.reduce((m, i) => ((m[i.id] = (m[i.id] || 0) + i.qty), m), {});
      const after = normalize(before);
      const afterCounts = after.reduce((m, i) => ((m[i.id] = (m[i.id] || 0) + i.qty), m), {});
      if ((afterCounts.bd1 || 0) > (beforeCounts.bd1 || 0) && (beforeCounts.sg1 || 0) > 0 && (beforeCounts.ln1 || 0) > 0) {
        setAutoBundled(true);
      }
      return after;
    });
  };

  const add = (p) =>
    safeSet((prev) => {
      const f = prev.find((i) => i.id === p.id);
      return f ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...prev, { ...p, qty: 1 }];
    });
  const remove = (id) => safeSet((prev) => prev.filter((i) => i.id !== id));
  const inc = (id) => safeSet((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  const dec = (id) => safeSet((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty - 1) } : i)).filter((i) => i.qty > 0));

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = items.length ? (subtotal >= 100 ? 0 : 14.95) : 0;
    const tax = subtotal * 0.0825;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total };
  }, [items]);

  return { items, add, remove, inc, dec, totals, autoBundled, clearAutoBundled: () => setAutoBundled(false) };
}

// ---- Router ----
const PAGES = {
  HOME: "HOME",
  ABOUT: "ABOUT",
  CONTACT: "CONTACT",
  FAQ: "FAQ",
  TESTIMONIALS: "TESTIMONIALS",
  SPANISH: "SPANISH",
  PRIVACY: "PRIVACY",
  TERMS: "TERMS",
};

// Added Terms button to top navigation
function Nav({ current, onNav }) {
  const tabs = [
    { id: PAGES.HOME, label: "Shop" },
    { id: PAGES.ABOUT, label: "About" },
    { id: PAGES.CONTACT, label: "Contact" },
    { id: PAGES.FAQ, label: "FAQ" },
    { id: PAGES.TESTIMONIALS, label: "Testimonials" },
    { id: PAGES.SPANISH, label: "Español" },
    { id: PAGES.PRIVACY, label: "Privacy" },
    { id: PAGES.TERMS, label: "Terms" }, // new terms tab
  ];
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onNav(t.id)}
          className={`rounded-full px-3 py-1 text-sm border ${current === t.id ? "bg-[var(--brand-accent)] text-white" : "bg-white"}`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function BannerAd() {
  return (
    <div className="mb-4 rounded-xl border-2 border-dashed p-4 text-center bg-white">
      <span className="brand-heading">Your ad could be here</span>
    </div>
  );
}

function HeaderBrand() {
  const logoSrcs = ["/images/SOLARIS-BLUE.png"];
  const starSrcs = ["/images/star-gold.png"];
  return (
    <div className="flex items-center gap-3">
      <ImageSafe srcs={starSrcs} alt="Solaris star" className="h-7 w-7 object-contain" />
      <a href={COMPANY.baseUrl} className="block">
        <ImageSafe srcs={logoSrcs} alt="Solaris wordmark" className="h-8 md:h-9 object-contain" />
      </a>
    </div>
  );
}

// ---- Pages ----
function HomePage({ cart, catalogRef }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <BannerAd />
      <span className="brand-badge">Featured</span>
      <h1 className="brand-heading mt-2 text-3xl font-bold leading-tight md:text-4xl">Solaris Sunglasses Collection</h1>
      <p className="mb-4 text-neutral-700">Frames with removable lenses. The bundle includes frames plus two lens pairs.</p>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">
        <p className="text-sm">
          <strong>Offer:</strong> Free shipping on orders $100+ and our <span className="brand-heading">Solaris Bundle</span> for $100 (save $10).
        </p>
        <button
          className="brand-btn"
          onClick={() => {
            const bundle = PRODUCTS.find((p) => p.id === "bd1");
            if (bundle) cart.add({ id: bundle.id, name: bundle.name, price: bundle.price });
            catalogRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Buy the Bundle
        </button>
      </div>

      <div ref={catalogRef} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl border bg-white">
            <div className="h-60 w-full overflow-hidden">
              <ImageSafe srcs={p.defaultUrls} alt={p.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <div className="brand-heading text-lg font-semibold">{p.name}</div>
              <div className="text-sm text-neutral-500">{p.tagline}</div>
            </div>
            <div className="px-4 pb-2 text-sm text-neutral-700">{p.description}</div>
            <div className="px-4 pb-4 text-xs text-neutral-700">{priceLine(p.price)}</div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="text-lg font-semibold">${p.price.toFixed(2)}</div>
              <button className="brand-btn" onClick={() => cart.add({ id: p.id, name: p.name, price: p.price })}>
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Product video */}
      <div className="mt-10 rounded-2xl border bg-white p-4">
        <h2 className="brand-heading text-xl mb-2">Product video</h2>
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
          <video controls className="w-full h-full" preload="metadata" poster="/images/poster.jpg">
            {/* Try root first, then /images for flexibility */}
            <source src="/solaris.mp4#t=0.1" type="video/mp4" />
            <source src="/images/solaris.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}

function AboutPage() {
  const staff = [
    { name: "Greg Ayala", title: "President", blurb: "Oversees company vision, operations, and product development.", img: "/images/greg.png" },
    { name: "Samantha Gonzales", title: "VP of Marketing", blurb: "Leads brand strategy, partnerships, and market outreach.", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format" },
    { name: "Abby Dulin", title: "VP of Customer Service & Outreach", blurb: "Focuses on customer satisfaction and community engagement.", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format" },
    { name: "Ryder Edwards", title: "VP of Technology", blurb: "Oversees digital infrastructure and product innovation.", img: "/images/ryder.png" },
    { name: "Troy Johnson", title: "VP of Products & Service", blurb: "Leads product design and service standards. With 7 years in premium eyewear and outdoor gear, Troy makes sure every Solaris frame and lens performs in real world use.", img: "/images/troy1.png" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="brand-heading text-3xl font-bold mb-2">About Solaris</h1>
      <p className="text-neutral-700 mb-4">
        Solaris began as a college project among four classmates in an E-Business class taught by Professor Kevin Jetton. What started as a shared passion for design and entrepreneurship quickly evolved into a thriving company. Our founders combined their backgrounds in technology, marketing, customer service, and leadership to create stylish, innovative eyewear built for modern life. Three years later, Solaris continues to grow, maintaining its commitment to quality craftsmanship, inclusive design, and sustainable practices.
      </p>
      <p className="text-neutral-700 mb-6">
        Founded officially in 2022, Solaris blends classic style with modern lens technology. We design for all faces and all walks of life with an inclusive fit program. Meet our leadership team below.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {staff.map((s) => (
          <div key={s.name} className="overflow-hidden rounded-2xl border bg-white">
            <ImageSafe srcs={[s.img, "https://images.unsplash.com/photo-1603415526960-f7e0328b27d8?q=80&w=600&auto=format"]} alt={s.name} className="h-48 w-full object-cover" />
            <div className="p-4">
              <div className="brand-heading text-lg font-semibold">{s.name}</div>
              <div className="text-sm text-neutral-500">{s.title}</div>
              <p className="text-sm text-neutral-700 mt-2">{s.blurb}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="brand-heading text-3xl font-bold mb-2">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold mb-1">Visit or mail</h2>
          <p className="text-sm">
            Solaris Eyewear Co.<br />1234 Commerce Ave, Suite 200<br />San Marcos, TX 78666<br />United States
          </p>
          <h2 className="font-semibold mt-4 mb-1">Call or email</h2>
          <p className="text-sm">
            Phone: (512) 555-0199
            <br />
            Email: <a href={`mailto:${COMPANY.emailSupport}`} className="underline">{COMPANY.emailSupport}</a>
          </p>
        </div>
        <form
          className="rounded-2xl border bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = `mailto:${COMPANY.emailWebmaster}?subject=Website%20technical%20issue`;
          }}
        >
          <h2 className="font-semibold mb-2">Webmaster technical support</h2>
          <p className="text-xs text-neutral-600 mb-2">Click send to open your email client addressed to our webmaster.</p>
          <button type="submit" className="brand-btn">Email {COMPANY.emailWebmaster}</button>
        </form>
      </div>
    </section>
  );
}

function FAQPage() {
  const faqs = [
    { q: "Do the sunglasses fit different face shapes?", a: "Yes, our spring hinges and nose bridge options fit a wide range." },
    { q: "What is the lens UV rating?", a: "All Solaris lenses block 99 percent of UVA and UVB." },
    { q: "How long is shipping?", a: "Orders ship in 2 to 4 business days. Free shipping at $100 or more." },
    { q: "Do you ship internationally?", a: "Yes, we ship across North America for $20 USD and Europe/Asia for $30 USD." },
    { q: "Do you sell frames only?", a: "We currently do not, but plan to in the future. Our upcoming frame only line will remain compatible with all Solaris lenses." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="brand-heading text-3xl font-bold mb-2">FAQs</h1>
      <div className="space-y-3">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-xl border bg-white p-4">
            <div className="font-semibold">{f.q}</div>
            <div className="text-sm text-neutral-700">{f.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsPage() {
  const rows = [
    { name: "Lena", city: "Dallas, TX", quote: "Love how easily I can swap out the lenses. Each replacement comes in a soft cloth pouch with different colors and polarizations." },
    { name: "Marco", city: "Austin, TX", quote: "I surf every weekend and switch between shades depending on sunlight. The magnetic lenses make it easy." },
    { name: "Priya", city: "San Antonio, TX", quote: "When my original lens cracked, I replaced it in seconds with the backup pair from the bundle. Still my favorite shades." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="brand-heading text-3xl font-bold mb-2">Customer testimonials</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rows.map((r) => (
          <div key={r.name} className="rounded-2xl border bg-white">
            <div className="p-4">
              <div className="brand-heading text-lg font-semibold">{r.name}</div>
              <div className="text-sm text-neutral-500">{r.city}</div>
              <p className="text-sm text-neutral-700 mt-2">“{r.quote}”</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SpanishPage() {
  const hero = "https://images.unsplash.com/photo-1491557345352-5929e343eb89?q=80&w=1600&auto=format&fit=crop";
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl border bg-white mb-4">
        <img src={hero} alt="Colección Solaris" className="w-full h-56 object-cover" />
      </div>
      <h1 className="brand-heading text-3xl font-bold mb-2">Colección Solaris</h1>
      <p className="text-neutral-700 mb-4">Gafas de sol de diseño clásico con tecnología moderna. Envío gratis en pedidos de $100 o más.</p>
      <ul className="list-disc pl-6 text-sm text-neutral-700">
        <li>Solaris Signature Sunglasses - $85 USD</li>
        <li>Solaris Alternate Lenses - $25 USD</li>
        <li>Paquete Solaris (Gafas + Lentes) - $100 USD</li>
      </ul>
    </section>
  );
}

function PrivacyPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="brand-heading text-3xl font-bold mb-2">Privacy Policy & Security Practices</h1>
      <div className="rounded-2xl border bg-white p-4 space-y-3 text-sm text-neutral-800">
        <p>We respect your privacy and are committed to protecting your personal data. This demo site collects no personal data except what you voluntarily send via email links.</p>
        <p><span className="font-semibold">Cookies:</span> No tracking cookies are set.</p>
        <p><span className="font-semibold">Third parties:</span> We do not sell or share your data with a third party. All payment processing is done in house through Stripe.</p>
        <p><span className="font-semibold">Your rights:</span> To delete your personal data, contact our webmaster at <a href={`mailto:${COMPANY.emailWebmaster}`} className="underline">{COMPANY.emailWebmaster}</a>.</p>
        <h2 className="brand-heading text-2xl mt-6">Security Practices</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>HTTPS enforced across <span className="font-semibold">solaris.fit</span> with HSTS policy.</li>
          <li>No credit card data stored on our servers; all payments processed by PCI DSS compliant vendors.</li>
          <li>Least privilege access control for internal systems, with MFA required for admins.</li>
          <li>Regular dependency updates and automated vulnerability scanning.</li>
          <li>Customer data encrypted at rest and in transit.</li>
          <li>Public security contact: <a href={`mailto:${COMPANY.emailWebmaster}`} className="underline">{COMPANY.emailWebmaster}</a>.</li>
        </ul>
        
      </div>
    </section>
  );
}

function TermsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="brand-heading text-3xl font-bold mb-4">Business Policies & Terms</h1>
      <ul className="list-disc pl-6 text-sm text-neutral-700 space-y-2">
        <li>Payment is required in full at the time of order. We process confirmed orders immediately.</li>
        <li>Orders are confirmed and prepared for shipment within two business days.</li>
        <li>All orders are shipped via USPS Ground Advantage unless otherwise specified.</li>
        <li>Packages include shipping but not signature confirmation by default.</li>
        <li>International customers are responsible for any duties, taxes, or import fees applied by their country’s customs authorities.</li>
        <li>We reserve the right to refuse service or cancel orders at our discretion.</li>
        <li>All Solaris products include a 30 day satisfaction guarantee. If you are not happy, contact support for a return.</li>
        <li>Frames and lenses include a 90 day defect warranty covering manufacturer issues.</li>
      </ul>
      <p className="mt-6 text-sm text-neutral-600">For privacy and security details, see our combined <button onClick={() => window.dispatchEvent(new CustomEvent('solaris-nav', { detail: 'PRIVACY' }))} className="underline">Privacy Policy</button>.</p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="mx-auto flex max-w-6xl justify-between px-4 py-6 text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <span>
            © {new Date().getFullYear()} <a href={COMPANY.baseUrl} className="hover:underline">Solaris.fit</a>
          </span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('solaris-nav', { detail: 'TERMS' }))} className="hover:underline text-left">Terms</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('solaris-nav', { detail: 'PRIVACY' }))} className="hover:underline text-left">Privacy</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('solaris-nav', { detail: 'PRIVACY' }))} className="hover:underline text-left">Security</button>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500 hover:opacity-75"><path d="M22.46 6c-.77.35-1.6.59-2.46.7a4.27 4.27 0 0 0 1.88-2.36 8.59 8.59 0 0 1-2.72 1.04 4.24 4.24 0 0 0-7.22 3.86 12.04 12.04 0 0 1-8.74-4.43 4.23 4.23 0 0 0 1.31 5.65 4.17 4.17 0 0 1-1.92-.53v.05a4.25 4.25 0 0 0 3.4 4.16 4.22 4.22 0 0 1-1.91.07 4.25 4.25 0 0 0 3.96 2.94A8.52 8.52 0 0 1 2 19.54a12.03 12.03 0 0 0 6.53 1.92c7.84 0 12.12-6.5 12.12-12.13 0-.18 0-.36-.01-.54A8.65 8.65 0 0 0 24 5.1a8.44 8.44 0 0 1-2.54.7z" /></svg>
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-700 hover:opacity-75"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7h-2v-2.9h2V9.5c0-2 1.2-3.2 3-3.2.9 0 1.8.16 1.8.16v2h-1c-1 0-1.3.63-1.3 1.3v1.5h2.4l-.38 2.9h-2v7A10 10 0 0 0 22 12z" /></svg>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-pink-500 hover:opacity-75"><path d="M7.5 2A5.5 5.5 0 0 0 2 7.5v9A5.5 5.5 0 0 0 7.5 22h9a5.5 5.5 0 0 0 5.5-5.5v-9A5.5 5.5 0 0 0 16.5 2h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm4.75-.9a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z"/></svg>
          </a>
          <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 text-red-600 hover:opacity-75"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.1 2.5 7.6 6.08 9.12-.09-.77-.17-1.95.03-2.8.18-.77 1.16-4.9 1.16-4.9s-.3-.6-.3-1.5c0-1.4.8-2.45 1.8-2.45.84 0 1.25.63 1.25 1.38 0 .84-.54 2.1-.82 3.27-.23.98.49 1.78 1.46 1.78 1.75 0 3.1-1.84 3.1-4.48 0-2.34-1.68-3.98-4.08-3.98-2.78 0-4.4 2.08-4.4 4.23 0 .84.32 1.75.72 2.24.08.1.1.18.08.27-.08.3-.26.95-.3 1.08-.05.17-.18.23-.42.14-1.56-.63-2.55-2.58-2.55-4.15 0-3.37 2.45-6.48 7.07-6.48 3.7 0 6.58 2.63 6.58 6.13 0 3.68-2.32 6.64-5.55 6.64-1.08 0-2.1-.56-2.46-1.22l-.67 2.55c-.24.92-.9 2.07-1.33 2.78.99.31 2.03.48 3.1.48 5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
          </a>
          <a href={`mailto:${COMPANY.emailWebmaster}`} className="hover:underline text-neutral-600">{COMPANY.emailWebmaster}</a>
        </div>
      </div>
    </footer>
  );
}

// ---- App ----
export default function App() {
  const cart = useCart();
  const [showCart, setShowCart] = useState(false);
  const [page, setPage] = useState(PAGES.HOME);
  const catalogRef = useRef(null);
  const FREE_SHIP_THRESHOLD = 100;
  const remainingForFree = Math.max(0, FREE_SHIP_THRESHOLD - cart.totals.subtotal);
  const progress = Math.min(100, Math.round((cart.totals.subtotal / FREE_SHIP_THRESHOLD) * 100));

  // Runtime checks + cross page footer buttons
  useEffect(() => {
    try {
      console.group("Solaris runtime checks");
      const subtotal1 = 85; const shipping1 = subtotal1 >= 100 ? 0 : 14.95; console.assert(shipping1 === 14.95, "Ship 14.95 at 85");
      const remaining1 = Math.max(0, 100 - subtotal1); console.assert(remaining1 === 15, "Remain 15 at 85");
      const progress1 = Math.min(100, Math.round((subtotal1 / 100) * 100)); console.assert(progress1 === 85, "Progress 85 percent at 85");
      const subtotal2 = 100; const shipping2 = subtotal2 >= 100 ? 0 : 14.95; console.assert(shipping2 === 0, "Free ship at 100");
      const tax = +(100 * 0.0825).toFixed(2); console.assert(tax === 8.25, "Tax 8.25 on 100");
      const pl = priceLine(10); console.assert(pl === "$10.00 USD • $180.00 MXN • €9.20 EUR", "Currency line");
      console.groupEnd();
    } catch (e) { console.error("Runtime checks failed", e); }

    const onNav = (e) => {
      const target = e?.detail;
      if (target && PAGES[target]) setPage(target);
    };
    window.addEventListener('solaris-nav', onNav);
    return () => window.removeEventListener('solaris-nav', onNav);
  }, []);

  return (
    <div className="min-h-screen">
      <BrandStyles />
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <HeaderBrand />
          <div className="flex items-center gap-3">
            <Nav current={page} onNav={setPage} />
            <button className="brand-btn" onClick={() => setShowCart((v) => !v)}>
              Cart ({cart.items.reduce((n, i) => n + i.qty, 0)})
            </button>
          </div>
        </div>
      </header>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed right-4 top-16 z-50 w-[22rem] rounded-2xl border bg-white shadow-xl">
          <div className="flex items-center justify-between p-4">
            <span className="font-semibold">Your cart</span>
            <button className="text-sm opacity-70" onClick={() => setShowCart(false)}>Close</button>
          </div>
          <div className="max-h-80 overflow-auto px-4 pb-2">
            {cart.items.length === 0 ? (
              <p className="pb-4 text-sm text-neutral-600">Your cart is empty.</p>
            ) : (
              cart.items.map((i) => (
                <div key={i.id} className="mb-3 flex items-center justify-between border-b pb-3 text-sm">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-neutral-500">Qty {i.qty}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded border px-2" onClick={() => cart.dec(i.id)}>-</button>
                    <button className="rounded border px-2" onClick={() => cart.inc(i.id)}>+</button>
                    <button className="rounded border px-2" onClick={() => cart.remove(i.id)}>Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-1 p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">${cart.totals.subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between"><span>Shipping</span>{cart.totals.subtotal >= 100 ? (<span className="brand-badge">FREE</span>) : (<span className="tabular-nums">$14.95</span>)}</div>
            <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">${cart.totals.tax.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span className="tabular-nums">${cart.totals.total.toFixed(2)}</span></div>
            {cart.autoBundled && (
              <div className="mt-2 rounded-lg border bg-white p-2 text-xs">
                <span className="brand-badge mr-2">Bundle applied</span>
                We combined Sunglasses + Lenses into the <span className="font-medium">Solaris Bundle</span> to save you $10.
                <button className="ml-2 underline" onClick={cart.clearAutoBundled}>dismiss</button>
              </div>
            )}
            <button className="brand-btn w-full">Checkout</button>
          </div>
        </div>
      )}

      {/* Free shipping banner */}
      {cart.items.length > 0 && (
        <div className="w-full border-b bg-white/90">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
            {remainingForFree > 0 ? (
              <div>
                <span className="font-medium">${remainingForFree.toFixed(2)} away from free shipping.</span>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full" style={{ width: `${progress}%`, background: "var(--brand-accent)" }} />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2"><span className="brand-badge">Shipping: FREE</span><span>Congrats, you unlocked free shipping.</span></div>
            )}
          </div>
        </div>
      )}

      {/* Router switch */}
      {page === PAGES.HOME && <HomePage cart={cart} catalogRef={catalogRef} />}
      {page === PAGES.ABOUT && <AboutPage />}
      {page === PAGES.CONTACT && <ContactPage />}
      {page === PAGES.FAQ && <FAQPage />}
      {page === PAGES.TESTIMONIALS && <TestimonialsPage />}
      {page === PAGES.SPANISH && <SpanishPage />}
      {page === PAGES.PRIVACY && <PrivacyPage />}
      {page === PAGES.TERMS && <TermsPage />}

      <Footer />
    </div>
  );
}
