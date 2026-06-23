import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Somboun June",
  description:
    "Privacy Policy for Somboun June and NŪM Skincare. Learn how we collect, use, and protect your personal information.",
  alternates: { canonical: "https://sombounjunestudio.com/privacy-policy" },
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
            We may collect personal information that you voluntarily provide to us when you interact with our website:
          </p>
          <ul>
            <li><strong>Contact Form:</strong> Name, email address, phone number, and message contents.</li>
            <li><strong>Consultation Bookings (Cal.com):</strong> Appointment details, name, and contact information.</li>
            <li><strong>Shopping Cart:</strong> Order details, including items added to your cart and abandoned cart data.</li>
            <li><strong>Technical Data:</strong> Browser type, IP address, device information, and pages visited, collected automatically via Google Analytics and Vercel Analytics.</li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Respond to your inquiries and consultation requests</li>
            <li>Process and fulfill product orders and bookings</li>
            <li>Analyze website performance and user behavior to improve our services</li>
            <li>Send you order confirmations and follow-up communications</li>
            <li>Comply with applicable legal and regulatory obligations</li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>3. Third-Party Services</h2>
          <p>
            We utilize trusted third-party services to operate our website and business. These providers have their own privacy policies governing the use of your information:
          </p>
          <ul>
            <li>
              <strong>Cal.com</strong> (Booking): <a href="https://cal.com/privacy" target="_blank" rel="noopener noreferrer" className="pp-link">Privacy Policy</a>
            </li>
            <li>
              <strong>Google Analytics</strong> (Analytics): <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="pp-link">Privacy Policy</a>
            </li>
            <li>
              <strong>Vercel Analytics</strong> (Hosting & Analytics): <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="pp-link">Privacy Policy</a>
            </li>
            <li>
              <strong>Riman Skincare</strong> (Affiliate Partner): <a href="https://riman.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="pp-link">Privacy Policy</a>
            </li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>4. Cookies and Tracking</h2>
          <p>
            Our website uses cookies and similar tracking technologies to enhance your browsing
            experience, remember cart contents, and analyze site traffic. You can instruct your browser to refuse all
            cookies or to indicate when a cookie is being sent. Note that some features of the
            site may not function properly without cookies.
          </p>
        </section>

        <section className="pp-section">
          <h2>5. Marketing Communications</h2>
          <p>
            With your consent, we may send you marketing emails about new products, services, or updates. 
            You can opt-out of these communications at any time by clicking the &ldquo;unsubscribe&rdquo; 
            link provided in the emails or by contacting us directly.
          </p>
        </section>

        <section className="pp-section">
          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy. 
            Specifically, we keep tax, order, and booking records for up to 7 years to comply with Canadian legal and accounting requirements.
          </p>
        </section>

        <section className="pp-section">
          <h2>7. Sharing of Information</h2>
          <p>
            We value your privacy. <strong>We do not sell your personal information</strong> to third parties for marketing purposes. 
            Information is only shared with the trusted third-party service providers listed above as necessary to operate our business.
          </p>
        </section>

        <section className="pp-section">
          <h2>8. Your Rights Under PIPEDA</h2>
          <p>
            In accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA), you have the right to:
          </p>
          <ul>
            <li>Request access to the personal information we hold about you</li>
            <li>Request correction of inaccurate or incomplete information</li>
            <li>Withdraw your consent for data processing (subject to legal or contractual restrictions)</li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>9. Security</h2>
          <p>
            We implement reasonable administrative and technical measures to protect your personal
            information from unauthorized access, loss, or misuse. However, no method of transmission over the Internet or electronic
            storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="pp-section">
          <h2>10. Children&apos;s Privacy</h2>
          <p>
            Our website is not directed at children under the age of 18. We do not knowingly
            collect personal information from children. If you believe we have inadvertently
            collected such information, please contact us immediately so we can delete it.
          </p>
        </section>

        <section className="pp-section">
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by updating the &ldquo;Last updated&rdquo; date at the top of
            this page. We encourage you to review this policy periodically.
          </p>
        </section>

        <section className="pp-section">
          <h2>12. Contact Us</h2>
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

        <div className="pp-footer">
          <Link href="/" className="pp-back-btn">
            Back to Somboun June
          </Link>
        </div>
      </div>
    </main>
  );
}
