import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Terms & Conditions — AttentionSpam",
  description:
    "The terms that govern your use of AttentionSpam — the AI-assisted content creation workflow for app developers.",
};

const Bird = ({ size = 20 }) => (
  <svg className="bird" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path d="M2 22 L16 4 L30 22 L16 15 Z" fill="#f7f5f2" />
    <path d="M16 15 L16 28" stroke="#f7f5f2" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </svg>
);

export default async function Terms() {
  const { userId } = await auth();
  return (
    <div className="vgs-site">
      <div className="bg-grid" aria-hidden="true"></div>

      <header className="legal-nav">
        <Link className="nav-brand" href="/#top">
          <Bird size={20} />
          <span>AttentionSpam</span>
        </Link>
        {userId ? (
          <Link href="/dashboard" className="btn btn-light">Dashboard</Link>
        ) : (
          <Link href="/sign-in" className="btn btn-light">Login</Link>
        )}
      </header>

      <main className="legal">
        <div className="legal-wrap">
          <div className="legal-eyebrow"><span className="dot"></span>Legal</div>
          <h1>Terms &amp; Conditions</h1>
          <p className="legal-updated">Last updated: June 29, 2026</p>
          <p className="legal-intro">
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of
            AttentionSpam (the &ldquo;Service&rdquo;) — an AI-assisted content creation workflow
            for app developers. By creating an account or using the Service, you agree to these
            Terms. If you don&apos;t agree, please don&apos;t use the Service.
          </p>

          <hr className="legal-divider" />

          <section className="legal-section">
            <h2><span className="num">01</span>Who we are &amp; what we do</h2>
            <p>
              AttentionSpam (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) provides an
              AI-assisted content creation workflow for app developers. Once you describe your app,
              the Service may:
            </p>
            <ul>
              <li>Generate video ideas, scripts, captions, and voiceovers using AI;</li>
              <li>Create short-form vertical videos with text-to-speech and burned-in captions;</li>
              <li>Upload user-approved videos through TikTok&rsquo;s official upload flow, where they land as drafts for your review.</li>
            </ul>
            <p>
              You review all content before any platform action is initiated. For TikTok, we upload
              your approved videos through TikTok&rsquo;s official API. After upload, you complete
              any final editing, disclosures, privacy settings, and decide whether to publish inside
              TikTok. AttentionSpam does not automatically publish TikTok content or automate
              engagement. Features, formats, and supported platforms may change as the product
              evolves.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">02</span>Eligibility</h2>
            <p>
              You must be at least 18 years old (or the age of majority in your jurisdiction) and
              able to form a binding contract to use the Service. If you use the Service on behalf
              of a company or other entity, you represent that you&apos;re authorized to bind that
              entity to these Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">03</span>Early access</h2>
            <p>
              The Service is currently offered in early access. This means it is provided
              &ldquo;as is,&rdquo; may contain bugs, and may change, break, or be unavailable
              without notice. We onboard users manually and may add, modify, or remove features at
              any time. Early-access participation does not guarantee continued access or any
              specific feature in the future.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">04</span>Your account &amp; connected platforms</h2>
            <p>
              To use the Service, you authorize AttentionSpam to connect to your third-party
              accounts — including <strong>TikTok</strong> — through their official APIs. By
              connecting these accounts, you confirm that:
            </p>
            <ul>
              <li>You own or are authorized to manage those accounts;</li>
              <li>TikTok permissions are used only to identify your connected account and upload user-approved video content;</li>
              <li>You will keep your login and authorization credentials secure.</li>
            </ul>
            <p>
              You are responsible for all activity that occurs under your account. You can revoke
              our access at any time through the relevant platform&apos;s settings or by asking us
              to disconnect.
            </p>
            <p>
              No TikTok upload begins without your explicit action. After upload, you complete any
              final review, disclosure, settings, and publishing steps inside TikTok.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">05</span>Third-party platform rules</h2>
            <p>
              Content uploaded through the Service must comply with the terms, community guidelines,
              and policies of each destination platform (including TikTok). You are responsible for
              ensuring your use of the Service — and the content it produces — complies with those
              rules. We are not responsible for any account suspension, shadow-ban, reach
              limitation, or other action taken by a third-party platform.
            </p>
            <p>
              Where applicable, AttentionSpam may help you identify AI-generated-content or
              commercial-content disclosure requirements. You are responsible for reviewing final
              disclosure settings, music choices, privacy options, and publishing settings inside
              TikTok before any content goes live.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">06</span>AI-generated content</h2>
            <p>
              Scripts, voiceovers, captions, and videos are generated using AI and automated
              tooling. Because of how generative systems work:
            </p>
            <ul>
              <li>Output may be inaccurate, repetitive, incomplete, or unexpected;</li>
              <li>Similar output may be generated for other users — we don&apos;t guarantee uniqueness;</li>
              <li>You are responsible for reviewing all output before initiating an upload and before publishing inside TikTok or any other platform.</li>
            </ul>
            <p>
              We do not guarantee factual accuracy, uniqueness, results, reach, users, installs, or
              revenue. You should not rely on AI-generated content as professional, legal,
              financial, or factual advice about your app or anything else.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">07</span>Your content &amp; responsibilities</h2>
            <p>
              You retain ownership of the materials you provide (your app description, branding,
              assets, and similar inputs — &ldquo;Your Content&rdquo;). You grant us a worldwide,
              non-exclusive license to use, reproduce, modify, and process Your Content solely to
              operate and provide the Service, including generating content and preparing
              user-approved videos for upload through connected-platform integrations.
            </p>
            <p>You represent and warrant that:</p>
            <ul>
              <li>You have all rights necessary to provide Your Content and to have it used as described, including the rights to upload it to TikTok and other platforms;</li>
              <li>Your Content and the resulting videos do not infringe anyone&apos;s intellectual property, privacy, or other rights;</li>
              <li>You will not use the Service to upload content you do not own or have rights to use;</li>
              <li>You will not use the Service to promote anything unlawful, deceptive, harmful, or in violation of any platform&apos;s rules.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2><span className="num">08</span>Acceptable use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Create or upload content that is illegal, hateful, harassing, sexually explicit involving minors, or otherwise harmful;</li>
              <li>Impersonate others or misrepresent your affiliation with any person or entity;</li>
              <li>Spam, manipulate engagement, or violate any platform&apos;s automation, upload, or posting policies;</li>
              <li>Upload content you do not own or have rights to use;</li>
              <li>Reverse engineer, scrape, overload, or interfere with the Service or its infrastructure;</li>
              <li>Resell or provide the Service to third parties without our written permission.</li>
            </ul>
            <p>
              We may suspend or terminate access if we believe you have violated these Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">09</span>Fees</h2>
            <p>
              The Service is currently <strong>free</strong> during early access — no credit card
              required. We may introduce paid plans in the future. If we do, we&apos;ll give you
              notice before charging you, and you&apos;ll be able to choose whether to continue.
              Any pricing, included usage, and billing terms will be presented to you at that time.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">10</span>Intellectual property</h2>
            <p>
              The Service, including its software, design, branding, and underlying technology, is
              owned by AttentionSpam and protected by intellectual property laws. These Terms
              don&apos;t grant you any rights to our trademarks or branding except as needed to use
              the Service. Subject to your compliance with these Terms, you own the final videos
              produced for your own accounts.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">11</span>Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
              warranties of any kind, whether express or implied, including fitness for a particular
              purpose, merchantability, and non-infringement. We do not warrant that the Service
              will be uninterrupted, error-free, or secure, or that any content it produces will
              generate views, followers, installs, revenue, or any particular outcome for your app.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">12</span>Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, AttentionSpam and its team will not be liable
              for any indirect, incidental, special, consequential, or punitive damages, or for any
              loss of profits, data, goodwill, reach, or account access, arising out of or related
              to your use of the Service. Our total liability for any claim relating to the Service
              will not exceed the greater of the amount you paid us in the 12 months before the
              claim or USD $100.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">13</span>Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless AttentionSpam from any claims, damages,
              liabilities, and expenses (including reasonable legal fees) arising from Your Content,
              your use of the Service, your violation of these Terms, or your violation of any
              third-party platform&apos;s rules or any law.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">14</span>Termination</h2>
            <p>
              You may stop using the Service and disconnect your accounts at any time. We may
              suspend or terminate your access at any time, with or without notice, if you violate
              these Terms or if we discontinue the Service. Provisions that by their nature should
              survive termination — including ownership, disclaimers, limitation of liability, and
              indemnification — will continue to apply.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">15</span>Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. When we make material changes, we&apos;ll
              update the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you.
              Your continued use of the Service after changes take effect means you accept the
              revised Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">16</span>Governing law</h2>
            <p>
              These Terms are governed by the laws of India, without regard to conflict-of-law
              principles. Any disputes will be resolved in the courts located in Surat, Gujarat,
              India, unless mandatory law in your country of residence requires otherwise.
              AttentionSpam is operated by Darshan Patel.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">17</span>Contact us</h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <a href="mailto:hello@attentionspam.com">hello@attentionspam.com</a>.
            </p>
          </section>

          <div className="legal-foot">
            <span>© 2026 AttentionSpam. Built for indie app developers.</span>
            <Link href="/#top">Back to home →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
