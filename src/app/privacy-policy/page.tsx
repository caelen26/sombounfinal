import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Somboun June",
  description:
    "Privacy Policy for Somboun June and NŪM Skincare. Learn how we collect, use, and protect your personal information.",
  alternates: { canonical: "https://sombounjune.com/privacy-policy" },
};

export default function PrivacyPolicy() {
  return (
    <main className="pp-page">
      <div className="pp-inner">
        <div className="pp-header">
          <Link href="/" className="pp-back">
            ← Back
          </Link>
          <p className="pp-updated">Last updated: May 2026</p>
        </div>

        <h1 className="pp-title">Privacy Policy</h1>
        <p className="pp-intro">
          Somboun June (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates this
          website and the NŪM Skincare product line. This Privacy Policy explains how we collect,
          use, disclose, and safeguard your information when you visit our website or place an
          order with us. Please read this policy carefully.
        </p>

        <section className="pp-section">
          <h2>1. Information We Collect</h2>
          <p>
            We may collect personal information that you voluntarily provide to us when you:
          </p>
          <ul>
            <li>Submit our contact or consultation request form (name, email, phone number, message)</li>
            <li>Place a product order via email (name, shipping address, order details)</li>
            <li>Subscribe to any future communications from us</li>
          </ul>
          <p>
            We may also automatically collect certain non-personal information when you visit our
            site, including browser type, IP address, pages visited, and referring URLs, through
            standard web server logs or analytics tools.
          </p>
        </section>

        <section className="pp-section">
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Respond to your inquiries and consultation requests</li>
            <li>Process and fulfil product orders</li>
            <li>Send you order confirmations and follow-up communications</li>
            <li>Improve our website and services</li>
            <li>Comply with applicable legal obligations</li>
          </ul>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties
            for marketing purposes.
          </p>
        </section>

        <section className="pp-section">
          <h2>3. Affiliate Links</h2>
          <p>
            This website contains affiliate links, including links to Riman Skincare. If you click
            an affiliate link and make a purchase, we may earn a commission at no additional cost
            to you. We only recommend products we genuinely believe in.
          </p>
        </section>

        <section className="pp-section">
          <h2>4. Cookies &amp; Tracking</h2>
          <p>
            Our website may use cookies and similar tracking technologies to enhance your browsing
            experience and analyse site traffic. You can instruct your browser to refuse all
            cookies or to indicate when a cookie is being sent. Note that some features of the
            site may not function properly without cookies.
          </p>
        </section>

        <section className="pp-section">
          <h2>5. Third-Party Services</h2>
          <p>
            We may use third-party services such as Cal.com for appointment booking and standard
            email providers for communication. These services have their own privacy policies
            governing the use of your information.
          </p>
        </section>

        <section className="pp-section">
          <h2>6. Data Security</h2>
          <p>
            We implement reasonable administrative and technical measures to protect your personal
            information. However, no method of transmission over the Internet or electronic
            storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="pp-section">
          <h2>7. Your Rights</h2>
          <p>
            You have the right to request access to, correction of, or deletion of the personal
            information we hold about you. To exercise these rights, please contact us at{" "}
            <a href="mailto:sombounp@gmail.com" className="pp-link">
              sombounp@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="pp-section">
          <h2>8. Children&apos;s Privacy</h2>
          <p>
            Our website is not directed at children under the age of 13. We do not knowingly
            collect personal information from children. If you believe we have inadvertently
            collected such information, please contact us immediately.
          </p>
        </section>

        <section className="pp-section">
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by updating the &ldquo;Last updated&rdquo; date at the top of
            this page. We encourage you to review this policy periodically.
          </p>
        </section>

        <section className="pp-section">
          <h2>10. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us:
          </p>
          <address className="pp-address">
            <strong>Somboun June</strong>
            <br />
            Winnipeg, Manitoba, Canada
            <br />
            <a href="mailto:sombounp@gmail.com" className="pp-link">
              sombounp@gmail.com
            </a>
          </address>
        </section>
      </div>
    </main>
  );
}
