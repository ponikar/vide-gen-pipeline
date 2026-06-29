import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Privacy Policy — AttentionSpam",
  description:
    "How AttentionSpam collects, uses, and protects your data — including the access we use to upload content to your connected TikTok and Instagram accounts.",
};

const Bird = ({ size = 20 }) => (
  <svg className="bird" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path d="M2 22 L16 4 L30 22 L16 15 Z" fill="#f7f5f2" />
    <path d="M16 15 L16 28" stroke="#f7f5f2" strokeWidth="2.6" fill="none" strokeLinecap="round" />
  </svg>
);

export default async function Privacy() {
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
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: June 29, 2026</p>
          <p className="legal-intro">
            This Privacy Policy explains how AttentionSpam (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) collects, uses, shares, and protects your information when you use our
            service — the AI-assisted content engine that scripts, generates, and uploads
            short-form videos to your connected social accounts. By using AttentionSpam, you agree to the
            practices described here.
          </p>

          <hr className="legal-divider" />

          <section className="legal-section">
            <h2><span className="num">01</span>Information we collect</h2>
            <p>We collect the following categories of information:</p>

            <h3>Information you give us</h3>
            <ul>
              <li><strong>Account details</strong> — your name, email address, and any login credentials you create;</li>
              <li><strong>App &amp; brand inputs</strong> — your app description, links, branding, and any assets you provide so we can generate content;</li>
              <li><strong>Communications</strong> — messages you send us for support, feedback, or early-access onboarding.</li>
            </ul>

            <h3>Information from connected platforms</h3>
            <p>
              When you connect <strong>TikTok</strong> and <strong>Instagram</strong>, you authorize
              us to access certain data through their official APIs so we can provide the Service.
              Depending on the permissions you grant, this may include:
            </p>
            <ul>
              <li>For TikTok: your account identifier, display name, and profile image (via the <code>user.info.basic</code> scope);</li>
              <li>Access tokens that let us upload user-approved content (we never see or store your platform password);</li>
              <li>Upload status for videos we send to TikTok.</li>
            </ul>

            <h3>Information collected automatically</h3>
            <ul>
              <li><strong>Usage data</strong> — how you interact with the Service, features used, and actions taken;</li>
              <li><strong>Device &amp; log data</strong> — IP address, browser type, device information, and timestamps;</li>
              <li><strong>Cookies &amp; similar technologies</strong> — used to keep you signed in and to understand usage (see Section 07).</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2><span className="num">02</span>How we use your information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide the Service — generate scripts, videos, and voiceovers, and upload user-approved videos to connected platforms for review and completion by the user;</li>
              <li>Authenticate you and maintain your account and connected-platform sessions;</li>
              <li>Operate, maintain, debug, and improve the Service and its AI output;</li>
              <li>Communicate with you about updates, support, and early-access onboarding;</li>
              <li>Protect against fraud, abuse, and violations of our Terms;</li>
              <li>Comply with legal obligations;</li>
              <li>Where applicable, help users identify AI-generated or commercial-content disclosures. Users remain responsible for reviewing final disclosures and publishing settings inside the platform.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2><span className="num">03</span>AI processing</h2>
            <p>
              To generate content, we process your inputs (such as your app description) using
              AI models and automated tooling, which may include trusted third-party providers. We
              do not sell your inputs, and we do not use your connected-account credentials to train
              AI models. Where third-party AI providers are used, we share only what is necessary to
              produce your content.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">04</span>How we share information</h2>
            <p>
              We do <strong>not</strong> sell your personal information. We share it only in these
              limited situations:
            </p>
            <ul>
              <li><strong>Connected platforms</strong> — we send the user-approved content needed to upload to TikTok and Instagram;</li>
              <li><strong>Service providers</strong> — hosting, storage, analytics, and AI vendors who process data for us under confidentiality obligations;</li>
              <li><strong>Legal reasons</strong> — when required by law, regulation, legal process, or to protect the rights, safety, and property of our users or us;</li>
              <li><strong>Business transfers</strong> — in connection with a merger, acquisition, or sale of assets, subject to this Policy.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2><span className="num">05</span>Third-party platform data</h2>
            <p>
              Our use and transfer of information received from TikTok and Instagram/Meta APIs adhere
              to those platforms&apos; developer policies, including all applicable Limited Use
              requirements. Specifically, information received from TikTok&apos;s APIs is used only
              to authenticate the user, show the connected TikTok account, and upload user-approved
              content through TikTok&apos;s official API. We do not use TikTok data for advertising,
              unrelated profiling, resale, or training AI models. We do not access followers,
              messages, analytics, existing videos, or contacts unless a user later authorizes
              additional scopes. The way TikTok and Instagram handle your data on their own platforms
              is governed by their respective privacy policies, not this one.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">06</span>Data retention</h2>
            <p>
              We keep your information for as long as your account is active or as needed to provide
              the Service. We may retain certain information after account closure where necessary to
              comply with legal obligations, resolve disputes, or enforce our agreements. When you
              disconnect TikTok or delete your account, we revoke the related access token and delete
              associated TikTok connection data within 30 days, unless retention is required by law.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">07</span>Cookies</h2>
            <p>
              We use cookies and similar technologies to keep you signed in, remember preferences,
              and understand how the Service is used. You can control cookies through your browser
              settings, though disabling them may affect how the Service works.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">08</span>Data security</h2>
            <p>
              We use reasonable technical and organizational measures to protect your information,
              including encrypted storage of access tokens and restricted access to systems. No
              method of transmission or storage is completely secure, so we cannot guarantee
              absolute security. You are responsible for keeping your account credentials safe.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">09</span>Your rights &amp; choices</h2>
            <p>Depending on where you live, you may have the right to:</p>
            <ul>
              <li>Access, correct, or delete the personal information we hold about you;</li>
              <li>Disconnect your TikTok or Instagram accounts at any time, revoking our access;</li>
              <li>Object to or restrict certain processing, or request a copy of your data;</li>
              <li>Withdraw consent where processing is based on consent.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:hello@attentionspam.com">hello@attentionspam.com</a>. You can also revoke
              our access directly from TikTok or Instagram&apos;s connected-apps settings.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">10</span>Children&apos;s privacy</h2>
            <p>
              The Service is not intended for anyone under 18, and we do not knowingly collect
              personal information from children. If you believe a minor has provided us with
              information, contact us and we will delete it.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">11</span>International users</h2>
            <p>
              We may process and store your information in countries other than where you live. By
              using the Service, you understand your information may be transferred to and processed
              in jurisdictions with different data-protection laws than your own.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">12</span>Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make material changes,
              we&apos;ll update the &ldquo;Last updated&rdquo; date above and, where appropriate,
              notify you. Your continued use of the Service after changes take effect means you
              accept the revised Policy.
            </p>
          </section>

          <section className="legal-section">
            <h2><span className="num">13</span>Contact us</h2>
            <p>
              Questions about this Privacy Policy or your data? Reach us at{" "}
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
