import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "privacy_policy" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading privacy policy:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 pb-24 text-slate-300">
      <div className="max-w-3xl mx-auto">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="text-gray-400 hover:text-white mb-4 -ml-2 text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        
        {/* Document Header */}
        <div className="mb-6 pb-4 border-b border-white/10">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
            PRIVACY POLICY & DATA PROTECTION POLICY
          </h1>
          <div className="text-xs text-slate-400 space-y-0.5">
            <p><strong>Effective Date:</strong> 30 August 2026</p>
            <p><strong>Last Updated:</strong> 30 August 2026</p>
            <p><strong>Jurisdiction:</strong> Republic of India</p>
          </div>
        </div>

        {content ? (
          <div 
            className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm"
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
        ) : (
          <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
            
            {/* Preamble */}
            <div className="space-y-2">
              <p>
                BattleHub (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) respects your privacy and is committed to protecting the personal information entrusted to us.
              </p>
              <p className="text-slate-400">
                This Privacy Policy explains how BattleHub collects, uses, stores, shares, protects, and otherwise processes personal data when you access or use our websites, mobile applications, tournament-management services, SaaS platforms, APIs, and related services (collectively, the &ldquo;Platform&rdquo;).
              </p>
              <p className="font-semibold text-white">
                By accessing or using the Platform, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>

            <hr className="border-white/10" />

            {/* 1 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">1. ABOUT BATTLEHUB</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub is an esports tournament and tournament-management technology platform that provides digital infrastructure for players, tournament organizers, teams, communities, institutions, and other authorized users.
              </p>
              <p className="text-slate-400 mb-1.5">
                The Platform provides digital features including tournament creation and management, player and team registration, match and bracket management, leaderboards and scoring, match-room distribution, result verification, anti-cheat and fraud-prevention mechanisms, prize-management and payout facilitation, organizer dashboards, communication and support services, analytics and reporting, and other esports-related technology services.
              </p>
              <p className="text-slate-400">
                BattleHub may operate as a technology service provider and, where applicable, an intermediary under applicable Indian law. The exact legal role of BattleHub may vary depending on the particular service, transaction, or activity being performed.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">2. APPLICABLE LAW</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub aims to process personal data in accordance with applicable Indian laws and regulations, including the Information Technology Act, 2000; the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021; the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;) and rules or regulations made thereunder; applicable taxation and financial regulations; directions issued by competent governmental or regulatory authorities; and other applicable laws and regulations of India.
              </p>
              <p className="text-slate-400">
                Nothing in this Privacy Policy is intended to limit any rights available to users under applicable law.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">3. DEFINITIONS</h2>
              <p className="text-slate-400">
                For the purposes of this Privacy Policy, &ldquo;Personal Data&rdquo; means any data about an individual who is identifiable by or in relation to such data, to the extent recognized under applicable law. &ldquo;User&rdquo; means any person who accesses or uses the Platform. &ldquo;Data Principal&rdquo; has the meaning assigned to it under applicable data-protection law. &ldquo;Tournament Organizer&rdquo; means a person, organization, institution, brand, or other entity using BattleHub&apos;s tournament-management services. &ldquo;Platform&rdquo; includes BattleHub websites, applications, SaaS dashboards, APIs, software, communication systems, and associated services.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">4. INFORMATION WE COLLECT</h2>
              <p className="text-slate-400 mb-2">
                We collect information that is reasonably necessary to provide, secure, improve, and administer our services.
              </p>
              <div className="space-y-2 text-slate-400">
                <p>
                  <strong className="text-white">4.1 Account and Identity Information:</strong> Depending on the services you use, we may collect full name, mobile number, email address, username, profile information, date of birth or age-verification information, in-game name (IGN), game UID or player ID, team or clan information, organizer or business information, and KYC information where legally required. Where verification is legally or operationally necessary, we may request additional documentation.
                </p>
                <p>
                  <strong className="text-white">4.2 Tournament Information:</strong> When you participate in or organize a tournament, we may collect tournament registration information, team and player details, match participation records, match results, kill and placement statistics, leaderboard information, tournament history, room or lobby participation information, disqualification or penalty records, and organizer-generated tournament information. Some tournament information may be publicly displayed on the Platform.
                </p>
                <p>
                  <strong className="text-white">4.3 Device and Technical Information:</strong> To operate and secure the Platform, we may automatically collect technical information, including device model, operating system and version, application version, IP address, network information, device identifiers where permitted by applicable law, browser information, crash reports, performance information, login and authentication records, and security and fraud-prevention signals.
                </p>
                <p>
                  <strong className="text-white">4.4 Anti-Cheat and Security Information:</strong> Where technically and legally permitted, BattleHub may process information required to identify cheating, manipulation, unauthorized access, account sharing, emulator abuse, automation, scripting, or other forms of platform abuse. This may include match participation logs, room-entry records, match statistics, game-related telemetry made available to BattleHub, security events, device and session information, account activity patterns, and relevant match recordings or evidence submitted for dispute resolution.
                </p>
              </div>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">5. FINANCIAL AND PAYMENT INFORMATION</h2>
              <p className="text-slate-400 mb-1.5">
                Where the Platform supports prize payouts, subscriptions, organizer payments, refunds, or other financial transactions, we may process information necessary to complete the transaction, which may include bank account details, IFSC, UPI ID or VPA, transaction identifiers, payment status, billing information, and tax-related information.
              </p>
              <p className="text-slate-400">
                BattleHub does not store sensitive payment authentication information such as Card CVV, ATM PIN, UPI PIN, or Net-banking passwords. Payment transactions are processed through third-party payment service providers and payment aggregators.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">6. HOW WE USE PERSONAL DATA</h2>
              <p className="text-slate-400 mb-1.5">BattleHub may process personal data for multiple operational purposes:</p>
              <div className="space-y-1.5 text-slate-400">
                <p><strong className="text-white">A. Providing Services:</strong> Managing user accounts, registering players and teams, managing tournaments, generating brackets, providing match-room information, maintaining leaderboards, recording results, and processing authorized payouts.</p>
                <p><strong className="text-white">B. Security and Fraud Prevention:</strong> Preventing unauthorized access, detecting cheating and abuse, identifying fraudulent activity, preventing duplicate or abusive accounts, investigating disputes, and enforcing Platform rules.</p>
                <p><strong className="text-white">C. Communication:</strong> Sending OTPs, providing service notifications, communicating tournament updates, responding to support requests, and notifying users about security matters.</p>
                <p><strong className="text-white">D. Legal and Regulatory Compliance:</strong> Complying with applicable law, responding to lawful governmental requests, meeting taxation requirements, preventing fraud, and defending legal claims.</p>
              </div>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">7. LEGAL BASIS FOR PROCESSING</h2>
              <p className="text-slate-400">
                Where the DPDP Act or other applicable data-protection law applies, BattleHub may process personal data on legally recognized grounds, including consent; provision of requested services; performance of obligations associated with the user&apos;s use of the Platform; compliance with legal obligations; and prevention, detection, and investigation of fraud or security incidents.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">8. SHARING AND DISCLOSURE OF INFORMATION</h2>
              <p className="text-white font-medium mb-1">BattleHub does not sell or rent personal data to data brokers.</p>
              <p className="text-slate-400">
                We may share information with trusted third parties where reasonably necessary to operate the Platform, including cloud hosting, database infrastructure, payment processing, SMS and OTP delivery, email delivery, analytics, security, customer support, and fraud prevention providers. We may also disclose information where required by applicable law in response to valid legal processes, court orders, government requests, or law-enforcement investigations.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">9. DATA SECURITY</h2>
              <p className="text-slate-400">
                BattleHub takes reasonable technical and organizational measures to protect personal data against unauthorized access, loss, or misuse, including encryption in transit and at rest, access controls, role-based permissions, monitoring, security reviews, and backup procedures.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">10. DATA RETENTION</h2>
              <p className="text-slate-400">
                We retain personal data only for as long as reasonably necessary to provide services, maintain account records, resolve disputes, prevent fraud, and comply with applicable statutory accounting and legal retention obligations.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">11. USER RIGHTS</h2>
              <p className="text-slate-400">
                Subject to applicable law, users may have rights to request information about processing, request correction of inaccurate data, request deletion where legally applicable, withdraw consent, and raise grievances through our official support channel.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">12. CHILDREN AND AGE REQUIREMENTS</h2>
              <p className="text-slate-400">
                BattleHub may impose age restrictions on particular tournaments or services. Where monetary entry or prizes are involved, participation is limited to persons who satisfy legal age requirements. We do not knowingly collect children&apos;s personal data for prohibited purposes.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">13. ESPORTS, SKILL-BASED COMPETITIONS AND STATE RESTRICTIONS</h2>
              <p className="text-slate-400 mb-1">
                BattleHub provides technology and infrastructure for esports and competitive gaming activities.
              </p>
              <p className="text-white font-medium mb-1">
                BattleHub does not operate or promote gambling, betting, wagering, lotteries, or games of chance.
              </p>
              <p className="text-slate-400">
                Users and organizers are responsible for ensuring compliance with applicable central and state laws. BattleHub may restrict participation from jurisdictions where required by law.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">14. COOKIES AND SIMILAR TECHNOLOGIES</h2>
              <p className="text-slate-400">
                Used to maintain sessions, remember preferences, improve Platform performance, understand usage patterns, and detect security threats.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">15. THIRD-PARTY SERVICES</h2>
              <p className="text-slate-400">
                Third-party services operate under their own terms and privacy policies. BattleHub is not responsible for the privacy practices of independent third-party services outside our control.
              </p>
            </section>

            {/* 16 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">16. INTERNATIONAL DATA TRANSFERS</h2>
              <p className="text-slate-400">
                Where personal data is transferred across jurisdictions, BattleHub takes steps required by applicable law and contractual security standards.
              </p>
            </section>

            {/* 17 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">17. DATA BREACH AND SECURITY INCIDENTS</h2>
              <p className="text-slate-400">
                If a data breach or incident occurs, appropriate measures will be taken including investigation, remediation, and statutory notification to authorities (including CERT-In) where required.
              </p>
            </section>

            {/* 18 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">18. GRIEVANCE REDRESSAL</h2>
              <p className="text-slate-400 mb-1.5">
                Users may contact BattleHub regarding privacy concerns, personal-data requests, or other grievances:
              </p>
              <div className="border-t border-b border-white/10 py-2.5 my-2 space-y-0.5 text-xs text-slate-300">
                <p><strong className="text-white">BattleHub</strong></p>
                <p>Grievance & Privacy Desk</p>
                <p><strong className="text-white">Email:</strong> <a href="mailto:contact@battlehub.site" className="text-orange-400 underline">contact@battlehub.site</a></p>
                <p><strong className="text-white">Location:</strong> Gautam Buddha Nagar, Greater Noida, Uttar Pradesh, India</p>
              </div>
            </section>

            {/* 19 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">19. ACCOUNT DELETION</h2>
              <p className="text-slate-400">
                Users may request deletion of their BattleHub account in-app or by emailing <a href="mailto:contact@battlehub.site" className="text-orange-400 underline">contact@battlehub.site</a>. Processed in accordance with statutory audit and legal retention laws.
              </p>
            </section>

            {/* 20 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">20. CHANGES TO THIS PRIVACY POLICY</h2>
              <p className="text-slate-400">
                Updated versions will be published on the Platform with a revised &ldquo;Last Updated&rdquo; date.
              </p>
            </section>

            {/* 21 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">21. GOVERNING LAW</h2>
              <p className="text-slate-400">
                Governed by the laws of the Republic of India. Subject to the jurisdiction of the competent courts in <strong>Gautam Buddha Nagar, Uttar Pradesh, India</strong>.
              </p>
            </section>

            {/* 22 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">22. CONTACT US</h2>
              <div className="border-t border-b border-white/10 py-2.5 my-2 space-y-0.5 text-xs text-slate-300">
                <p><strong className="text-white">BattleHub</strong></p>
                <p>Privacy & Grievance Desk</p>
                <p><strong className="text-white">Email:</strong> <a href="mailto:contact@battlehub.site" className="text-orange-400 underline">contact@battlehub.site</a></p>
                <p><strong className="text-white">Location:</strong> Gautam Buddha Nagar, Greater Noida, Uttar Pradesh, India</p>
              </div>
              <p className="text-center text-xs text-slate-500 pt-3">
                &copy; 2026 BattleHub . All Rights Reserved.
              </p>
            </section>

          </div>
        )}

      </div>
    </div>
  );
}
