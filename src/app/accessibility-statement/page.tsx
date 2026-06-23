import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility Statement | Somboun June",
  description:
    "Somboun June is committed to making our website accessible to all users. Read our WCAG 2.0 Level AA accessibility statement.",
  alternates: { canonical: "https://sombounjunestudio.com/accessibility-statement" },
};

export default function AccessibilityStatement() {
  return (
    <main className="pp-page">
      <div className="pp-inner">
        <div className="pp-header">
          <Link href="/" className="pp-back">
            ← Back
          </Link>
          <p className="pp-updated">Last updated: June 2026</p>
        </div>

        <h1 className="pp-title">Accessibility Statement</h1>
        <p className="pp-intro">
          Somboun June is committed to ensuring digital accessibility for people with disabilities.
          We continually improve the user experience for everyone and apply the relevant
          accessibility standards to achieve these goals.
        </p>

        <section className="pp-section">
          <h2>1. Conformance Status</h2>
          <p>
            We aim to conform to the{" "}
            <a
              href="https://www.w3.org/TR/WCAG20/"
              target="_blank"
              rel="noopener noreferrer"
              className="pp-link"
            >
              Web Content Accessibility Guidelines (WCAG) 2.0
            </a>{" "}
            at <strong>Level AA</strong>. WCAG defines requirements that make web content more
            accessible to people with disabilities. Conformance at Level AA means content satisfies
            all Level A and Level AA success criteria.
          </p>
          <p>
            We are working toward full conformance and actively address barriers as they are
            identified.
          </p>
        </section>

        <section className="pp-section">
          <h2>2. Measures We Have Taken</h2>
          <p>
            Somboun June takes the following measures to ensure accessibility of our website:
          </p>
          <ul>
            <li>
              <strong>Colour contrast:</strong> All text and interactive elements meet or exceed
              the WCAG 2.0 Level AA minimum contrast ratio of 4.5:1 for normal text and 3:1 for
              large text (Success Criterion 1.4.3).
            </li>
            <li>
              <strong>Text resizing:</strong> Text can be resized up to 200% without loss of
              content or functionality using browser zoom controls (Success Criterion 1.4.4).
            </li>
            <li>
              <strong>Keyboard navigation:</strong> All interactive elements — navigation menus,
              buttons, links, and forms — are fully operable by keyboard alone (Success Criteria
              2.1.1, 2.1.2).
            </li>
            <li>
              <strong>Focus indicators:</strong> Visible focus styles are applied to all interactive
              elements so keyboard and assistive technology users can track their location on the
              page (Success Criterion 2.4.7).
            </li>
            <li>
              <strong>Descriptive links:</strong> Link text is written to be meaningful out of
              context, avoiding generic labels like &ldquo;click here&rdquo; (Success Criterion
              2.4.4).
            </li>
            <li>
              <strong>Alternative text:</strong> All meaningful images include descriptive{" "}
              <code>alt</code> attributes. Decorative images are marked so that assistive
              technologies skip them (Success Criterion 1.1.1).
            </li>
            <li>
              <strong>Semantic HTML:</strong> Pages are built with proper heading hierarchy (
              <code>h1</code> through <code>h4</code>), landmark regions (<code>main</code>,{" "}
              <code>nav</code>, <code>footer</code>), and semantic list elements to support screen
              readers (Success Criteria 1.3.1, 2.4.1, 2.4.6).
            </li>
            <li>
              <strong>Language declaration:</strong> The page language is declared in the HTML{" "}
              <code>lang</code> attribute so screen readers use the correct pronunciation rules
              (Success Criterion 3.1.1).
            </li>
            <li>
              <strong>Form labels:</strong> All form inputs have associated visible labels or
              descriptive <code>aria-label</code> attributes (Success Criterion 1.3.1, 3.3.2).
            </li>
            <li>
              <strong>Error identification:</strong> Form validation errors are clearly described
              in text and associated programmatically with the relevant input field (Success
              Criteria 3.3.1, 3.3.3).
            </li>
            <li>
              <strong>No flashing content:</strong> Our website does not contain content that
              flashes more than three times per second (Success Criterion 2.3.1).
            </li>
            <li>
              <strong>Skip navigation:</strong> Users can bypass repeated navigation blocks to
              reach the main content directly (Success Criterion 2.4.1).
            </li>
            <li>
              <strong>Consistent navigation:</strong> Navigation menus and components that appear
              on multiple pages are presented in a consistent order and manner (Success Criteria
              3.2.3, 3.2.4).
            </li>
            <li>
              <strong>Dialogs and modals:</strong> Modal dialogs include proper ARIA roles (
              <code>role=&quot;dialog&quot;</code>, <code>aria-modal=&quot;true&quot;</code>),
              focus is moved to the dialog when it opens, and focus is returned to the trigger
              element when it closes (Success Criterion 2.4.3).
            </li>
            <li>
              <strong>Images of text:</strong> We use actual text rendered via CSS rather than
              images of text wherever possible (Success Criterion 1.4.5).
            </li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>3. Technical Specifications</h2>
          <p>
            Our website relies on the following technologies for conformance:
          </p>
          <ul>
            <li>HTML5</li>
            <li>CSS3</li>
            <li>JavaScript (ECMAScript 2020+)</li>
            <li>WAI-ARIA 1.1</li>
          </ul>
          <p>
            The website has been tested for compatibility with the following browsers and assistive
            technologies:
          </p>
          <ul>
            <li>Google Chrome (latest) with NVDA screen reader on Windows</li>
            <li>Safari (latest) with VoiceOver on macOS and iOS</li>
            <li>Mozilla Firefox (latest) on Windows and macOS</li>
            <li>Chrome for Android (latest) with TalkBack</li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>4. Known Limitations</h2>
          <p>
            Despite our efforts, you may encounter some areas that are not yet fully accessible.
            We are aware of the following limitations and are actively working to address them:
          </p>
          <ul>
            <li>
              <strong>Third-party booking widget (Cal.com):</strong> Our appointment booking
              interface is provided by Cal.com. While Cal.com publishes its own accessibility
              policy, we cannot guarantee full WCAG 2.0 Level AA conformance within their
              embedded widget. We encourage users who experience barriers to contact us directly
              to arrange an appointment by phone or email.
            </li>
            <li>
              <strong>Product images from Stripe:</strong> Product images displayed in the shop
              are sourced dynamically from our Stripe catalog. We strive to provide meaningful
              alternative text for all products; however, some images uploaded by our team may
              be missing optimal descriptions. We are reviewing and updating these on an ongoing
              basis.
            </li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>5. Assessment Approach</h2>
          <p>
            Somboun June assessed the accessibility of this website using the following approaches:
          </p>
          <ul>
            <li>Self-evaluation against WCAG 2.0 Level AA success criteria</li>
            <li>Manual keyboard navigation testing across all pages</li>
            <li>Screen reader testing with VoiceOver (macOS and iOS)</li>
            <li>Automated colour contrast analysis using browser developer tools</li>
            <li>Semantic HTML validation using the W3C Markup Validation Service</li>
          </ul>
        </section>

        <section className="pp-section">
          <h2>6. Feedback and Contact</h2>
          <p>
            We welcome your feedback on the accessibility of the Somboun June website. If you
            experience any barriers or have suggestions for improvement, please let us know:
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
          <p>
            We aim to respond to accessibility feedback within <strong>5 business days</strong>.
            If you are not satisfied with our response, you may contact the{" "}
            <a
              href="https://www.chrc-ccdp.gc.ca/en"
              target="_blank"
              rel="noopener noreferrer"
              className="pp-link"
            >
              Canadian Human Rights Commission
            </a>{" "}
            or the relevant provincial human rights body for further assistance.
          </p>
        </section>

        <section className="pp-section">
          <h2>7. Changes to This Statement</h2>
          <p>
            We review and update this Accessibility Statement as our website evolves and as we
            make accessibility improvements. The &ldquo;Last updated&rdquo; date at the top of
            this page reflects the most recent revision.
          </p>
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
