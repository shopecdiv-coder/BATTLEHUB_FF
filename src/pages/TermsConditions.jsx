import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsConditions() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "terms_conditions" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading terms:", error);
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
            TERMS & CONDITIONS
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
              <p className="font-semibold text-white">Welcome to BattleHub.</p>
              <p className="text-slate-400">
                These Terms & Conditions (&ldquo;Terms&rdquo;, &ldquo;Terms of Service&rdquo;, or &ldquo;Agreement&rdquo;) govern your access to and use of BattleHub&rsquo;s websites, mobile applications, software, tournament-management systems, SaaS services, APIs, dashboards, and related services (collectively, the &ldquo;Platform&rdquo;).
              </p>
              <p className="font-semibold text-white">
                By creating an account, accessing, or using the Platform, you agree to be legally bound by these Terms. If you do not agree with any part of these Terms, you must not use the Platform.
              </p>
            </div>

            <hr className="border-white/10" />

            {/* 1 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">1. ABOUT BATTLEHUB</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub is an esports technology and tournament-management platform operated by BattleHub (&ldquo;BattleHub&rdquo;, &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
              </p>
              <p className="text-slate-400 mb-1.5">
                BattleHub provides digital infrastructure that enables tournament creation and management, player and team registration, match scheduling, bracket management, room and lobby management, leaderboards and scoring, tournament result management, anti-cheat and fraud-prevention systems, organizer dashboards, prize-management and payout facilitation, communication and support tools, analytics, reporting, and other esports-related technology services.
              </p>
              <p className="text-slate-400">
                BattleHub may provide these services directly or through authorized tournament organizers, partners, institutions, brands, communities, or other entities.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">2. ELIGIBILITY</h2>
              <p className="text-slate-400 mb-1.5">
                You may use the Platform only if you are legally capable of entering into a binding agreement under applicable law. Certain features, tournaments, transactions, or prize-based activities may have additional age or eligibility requirements.
              </p>
              <p className="text-slate-400">
                Where a tournament or service involves monetary entry, prizes, withdrawals, or other regulated activities, participation may be restricted to users who satisfy the applicable legal age and jurisdictional requirements. BattleHub may require age verification, identity verification, KYC, or other verification before allowing access to particular services.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">3. ACCOUNT REGISTRATION</h2>
              <p className="text-slate-400 mb-1.5">
                Certain Platform features require you to create an account. You agree to provide accurate and complete information, keep your account information updated, maintain the confidentiality of your login credentials, not share your account with another person, immediately notify BattleHub of unauthorized access, use only accounts belonging to you, and accept responsibility for activities conducted through your account, subject to applicable law.
              </p>
              <p className="text-slate-400">
                You must not create an account using false, misleading, impersonating, or fraudulent information. BattleHub may suspend or terminate accounts that violate these Terms or applicable law.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">4. TOURNAMENT PARTICIPATION</h2>
              <p className="text-slate-400 mb-1.5">
                Tournament participation is subject to the published rules for each particular tournament, which may encompass entry requirements, game titles and modes, team size, match formats, scoring systems, registration deadlines, check-in requirements, schedules, disqualification criteria, prize structures, tie-breaking rules, anti-cheat requirements, and organizer-specific conditions.
              </p>
              <p className="text-slate-400">
                By joining a tournament, you agree to comply with both these Terms and the applicable tournament rules. Where a tournament is organized by an independent organizer, the organizer may be responsible for tournament-specific operational decisions, subject to the Platform&rsquo;s policies and applicable law.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">5. TOURNAMENT ENTRY AND FEES</h2>
              <p className="text-slate-400 mb-1.5">
                Some tournaments or services may require an entry fee, registration fee, subscription, or other payment. Before completing any transaction, the applicable amount and relevant terms will be displayed. Once a user completes registration, refunds will be governed by the specific tournament&rsquo;s refund policy and applicable law.
              </p>
              <p className="text-slate-400">
                BattleHub may cancel, postpone, modify, or terminate a tournament where reasonably necessary due to technical failures, security incidents, fraud or cheating, insufficient participation, game/server issues, organizer requirements, force majeure events, or legal and regulatory requirements. Where applicable, eligible refunds will be processed according to the applicable refund policy.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">6. PRIZES AND REWARDS</h2>
              <p className="text-slate-400 mb-1.5">
                Tournament prizes, rewards, or other benefits will be distributed according to published tournament rules. Prize eligibility depends upon final verified results, successful completion of verification, compliance with tournament rules, anti-cheat verification, KYC requirements, applicable tax requirements, and other eligibility conditions communicated before or during the tournament.
              </p>
              <p className="text-slate-400">
                BattleHub may withhold or delay a prize while investigating suspected cheating, fraud, manipulation, identity issues, or other rule violations. Where legally required, applicable taxes or statutory deductions (including TDS) may be made before payout.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">7. ORGANIZER RESPONSIBILITIES</h2>
              <p className="text-slate-400 mb-1.5">
                Tournament organizers using BattleHub&rsquo;s SaaS or tournament-management services are responsible for providing accurate tournament and prize information, setting lawful tournament rules, ensuring compliance with applicable laws, managing organizer communications, providing required participant information, following Platform policies, handling organizer-specific disputes, and not using BattleHub to conduct prohibited or unlawful activities.
              </p>
              <p className="text-slate-400">
                BattleHub provides technology infrastructure and does not automatically become the legal organizer of every tournament created by an independent organizer.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">8. SKILL-BASED ESPORTS</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub is designed for competitive esports and skill-based gaming activities. The outcome of an esports competition depends predominantly on factors including player skill, strategy, reaction time, coordination, game knowledge, teamwork, and training.
              </p>
              <p className="text-white font-medium mb-1.5">
                BattleHub does not operate or promote gambling, betting, wagering, lotteries, or games of chance.
              </p>
              <p className="text-slate-400">
                Where an activity involves entry fees or monetary prizes, its legality depends on applicable central and state laws and the structure and location of the activity. BattleHub reserves the right to restrict or discontinue activities where required by applicable law, regulatory requirements, platform policies, or risk controls.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">9. PROHIBITED ACTIVITIES</h2>
              <p className="text-slate-400">
                You must not use the Platform to conduct or promote illegal activities; conduct unauthorized gambling, betting, wagering, or lotteries; manipulate tournament results; use cheats, hacks, scripts, bots, exploits, or unauthorized software; use unauthorized automation; impersonate another player, organizer, employee, or entity; create fraudulent or deceptive accounts; sell, transfer, or share BattleHub accounts; exploit technical vulnerabilities; attempt unauthorized access to BattleHub systems; interfere with Platform operations; upload malware or malicious code; abuse payment, refund, wallet, or reward systems; submit fraudulent KYC or identity documents; harass, threaten, or abuse other users; upload illegal, defamatory, hateful, or infringing content; violate another person&rsquo;s rights; or circumvent any security, verification, geographical, or eligibility restriction.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">10. CHEATING AND FAIR PLAY</h2>
              <p className="text-slate-400">
                BattleHub maintains a zero-tolerance approach toward cheating and competitive manipulation. Prohibited conduct includes hacks, scripts, macros where prohibited, exploits, unauthorized game modifications, emulator abuse where prohibited, account sharing, match fixing, collusion, result manipulation, intentional disconnection, use of another player&rsquo;s account, or any other conduct intended to obtain an unfair competitive advantage. BattleHub investigates suspected violations using available technical and tournament data.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">11. ANTI-CHEAT INVESTIGATIONS</h2>
              <p className="text-slate-400 mb-1.5">
                Where reasonably necessary, BattleHub may review match records, tournament logs, device information, login activity, room-entry information, game-related telemetry available to BattleHub, submitted evidence, match recordings, account activity, and other relevant security information.
              </p>
              <p className="text-slate-400">
                If a violation is reasonably established, BattleHub may take appropriate action, including warnings, match or tournament disqualification, prize withholding or cancellation where legally permissible, temporary suspension, permanent account termination, or restriction from future tournaments. BattleHub may request additional information or evidence during an investigation.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">12. USER-GENERATED CONTENT</h2>
              <p className="text-slate-400 mb-1.5">
                Users and organizers may upload or submit content such as profile images, team logos, tournament banners, descriptions, messages, images, videos, match evidence, comments, and other materials. You retain ownership of content that you lawfully own.
              </p>
              <p className="text-slate-400">
                By submitting content to BattleHub, you grant BattleHub a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, transmit, and distribute that content as reasonably necessary to provide and operate the Platform. You are responsible for ensuring that your content does not violate applicable law or third-party rights. BattleHub may remove content that violates these Terms or applicable law.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">13. COMMUNICATION AND COMMUNITY FEATURES</h2>
              <p className="text-slate-400">
                BattleHub may provide chat, messaging, comments, team communication, or community features. Users must not use these features for harassment, threats, hate speech, spam, fraud, scams, sexual exploitation, illegal content, malicious links, impersonation, unauthorized advertising, or any other prohibited activity. BattleHub may restrict or remove content and may suspend accounts involved in serious or repeated violations.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">14. INTELLECTUAL PROPERTY</h2>
              <p className="text-slate-400 mb-1.5">
                All rights, title, and interest in the BattleHub Platform—including software, source code, user interface, designs, logos, trademarks, graphics, architecture, documentation, features, branding, and original content—are owned by or licensed to BattleHub, unless otherwise stated.
              </p>
              <p className="text-slate-400">
                Nothing in these Terms grants you ownership of BattleHub&rsquo;s intellectual property. You may not copy, modify, reproduce, reverse engineer, distribute, sell, lease, sublicense, or commercially exploit BattleHub&rsquo;s proprietary technology without prior written authorization.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">15. THIRD-PARTY GAMES AND SERVICES</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub may integrate with or provide functionality related to third-party games, platforms, payment providers, cloud services, communication services, or other third-party products. BattleHub does not own or control those third-party services.
              </p>
              <p className="text-slate-400">
                Your use of third-party services is subject to their respective terms and policies. BattleHub is not responsible for changes, outages, bans, restrictions, updates, or decisions made by third-party game publishers or service providers.
              </p>
            </section>

            {/* 16 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">16. PAYMENTS AND PAYMENT PROCESSING</h2>
              <p className="text-slate-400 mb-1.5">
                Payments may be processed through third-party payment processors or payment aggregators. BattleHub does not directly store sensitive payment authentication information such as Card CVV, ATM PIN, UPI PIN, or Net-banking passwords.
              </p>
              <p className="text-slate-400">
                Payment transactions are subject to the applicable terms of the payment service provider. Users must not use unauthorized payment methods, stolen payment instruments, fraudulent transactions, or chargeback abuse. BattleHub may suspend accounts associated with suspected payment fraud while investigating the matter.
              </p>
            </section>

            {/* 17 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">17. WALLET, CREDITS AND PLATFORM BALANCES</h2>
              <p className="text-slate-400 mb-1.5">
                Where BattleHub provides a wallet, credits, coins, or similar functionality, such balances may be used only for purposes expressly permitted by BattleHub.
              </p>
              <p className="text-slate-400">
                Unless expressly stated otherwise, platform credits are not bank deposits, do not constitute ownership in BattleHub, may not be transferred between users unless expressly permitted, may be subject to disclosed expiration or restrictions, and improperly obtained balances may be reversed. Withdrawals remain subject to identity verification and applicable statutory laws.
              </p>
            </section>

            {/* 18 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">18. REFUNDS AND CANCELLATIONS</h2>
              <p className="text-slate-400 mb-1.5">
                Refund eligibility depends on the relevant transaction, tournament rules, cancellation circumstances, and applicable law. A refund may be unavailable where the user has already participated in the tournament, the service has been substantially provided, the user violated tournament rules, the account was suspended due to misconduct, the transaction was fraudulent, or applicable law permits withholding the refund.
              </p>
              <p className="text-slate-400">
                Where BattleHub or an organizer cancels a tournament and a refund is legally and contractually due, the applicable amount will be processed through the designated payment method or according to the applicable refund mechanism.
              </p>
            </section>

            {/* 19 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">19. PRIVACY</h2>
              <p className="text-slate-400">
                Your use of BattleHub is also governed by our Privacy Policy, which explains how we collect, use, store, and protect personal data. By using the Platform, you acknowledge that your personal information may be processed in accordance with that Privacy Policy and applicable law.
              </p>
            </section>

            {/* 20 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">20. PLATFORM AVAILABILITY</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub aims to maintain reliable and secure services but does not guarantee uninterrupted availability. The Platform may occasionally be unavailable due to maintenance, software updates, server failures, network problems, cybersecurity incidents, third-party service outages, game-server issues, force majeure events, or regulatory requirements.
              </p>
              <p className="text-slate-400">
                BattleHub may modify, suspend, or discontinue any feature or service where reasonably necessary.
              </p>
            </section>

            {/* 21 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">21. DISCLAIMERS</h2>
              <p className="text-slate-400 mb-1.5">
                To the maximum extent permitted by applicable law, BattleHub provides the Platform on an &ldquo;as available&rdquo; and &ldquo;as is&rdquo; basis.
              </p>
              <p className="text-slate-400">
                BattleHub does not guarantee that the Platform will always be available, completely error-free, that tournament results will never require correction, that third-party game services will remain available, that every tournament will occur exactly as scheduled, that cheating or fraud will never occur, or that the Platform will meet every user&rsquo;s particular requirements. Nothing in these Terms excludes any liability or consumer right that cannot legally be excluded under applicable law.
              </p>
            </section>

            {/* 22 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">22. LIMITATION OF LIABILITY</h2>
              <p className="text-slate-400 mb-1.5">
                To the maximum extent permitted by applicable law, BattleHub shall not be liable for indirect, incidental, special, consequential, or punitive losses arising from use of the Platform, including losses resulting from third-party game outages, internet or network failures, unauthorized account access despite reasonable security measures, organizer actions, game-publisher decisions, tournament cancellations, force majeure events, or user misconduct.
              </p>
              <p className="text-slate-400">
                Nothing in these Terms limits liability that cannot legally be limited under applicable law, including liability arising from fraud or other matters that cannot lawfully be excluded.
              </p>
            </section>

            {/* 23 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">23. INDEMNIFICATION</h2>
              <p className="text-slate-400">
                To the extent permitted by applicable law, you agree to defend, indemnify, and hold harmless BattleHub, its officers, employees, contractors, affiliates, and service providers from claims, losses, liabilities, damages, costs, and expenses arising from your violation of these Terms, your unlawful use of the Platform, your violation of third-party rights, fraudulent or unauthorized activity conducted through your account, your tournament or organizer activities, or content submitted by you.
              </p>
            </section>

            {/* 24 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">24. ACCOUNT SUSPENSION AND TERMINATION</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub may suspend, restrict, or terminate your account where reasonably necessary if you violate these Terms, violate tournament rules, engage in cheating or fraud, attempt unauthorized access, misuse payment or wallet systems, create security or legal risks, as required by law or regulatory authorities, or where continued access would materially harm the Platform or other users.
              </p>
              <p className="text-slate-400">
                Where appropriate and legally permissible, BattleHub may provide notice or an opportunity to appeal. Termination does not automatically eliminate obligations or liabilities that arose before termination.
              </p>
            </section>

            {/* 25 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">25. APPEALS AND DISPUTE REVIEW</h2>
              <p className="text-slate-400 mb-1.5">
                Where an account, tournament result, or prize has been affected by enforcement action, BattleHub may provide an appeal or review mechanism. An appeal may require account identification, relevant tournament details, supporting evidence, and an explanation of the dispute.
              </p>
              <p className="text-slate-400">
                BattleHub may review available records and evidence before making a final decision. Certain decisions may be final where required to protect tournament integrity, prevent fraud, or comply with law.
              </p>
            </section>

            {/* 26 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">26. CHANGES TO THESE TERMS</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub may modify these Terms from time to time. Updated Terms will be published on the Platform with a revised &ldquo;Last Updated&rdquo; date. Where required by applicable law, BattleHub may provide additional notice regarding material changes.
              </p>
              <p className="text-slate-400">
                Your continued use of the Platform after the updated Terms become effective constitutes acceptance of the revised Terms, to the extent permitted by law.
              </p>
            </section>

            {/* 27 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">27. GOVERNING LAW</h2>
              <p className="text-slate-400 mb-1.5">
                These Terms shall be governed by and interpreted in accordance with the laws applicable in the Republic of India.
              </p>
              <p className="text-slate-400">
                Subject to applicable law, disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the competent courts in <strong>Gautam Buddha Nagar, Uttar Pradesh, India</strong>. Nothing in this clause limits any statutory right or remedy available to a user under applicable law.
              </p>
            </section>

            {/* 28 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">28. SEVERABILITY</h2>
              <p className="text-slate-400">
                If any provision of these Terms is determined to be invalid, unlawful, or unenforceable, that provision shall be modified or removed only to the extent necessary, and the remaining provisions shall continue in full force and effect.
              </p>
            </section>

            {/* 29 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">29. ENTIRE AGREEMENT</h2>
              <p className="text-slate-400 mb-1.5">
                These Terms, together with the Privacy Policy, applicable tournament rules, refund policies, organizer agreements, and other policies expressly incorporated into the Platform, constitute the agreement governing your use of BattleHub.
              </p>
              <p className="text-slate-400">
                If there is a conflict between these Terms and a specific tournament rule, the specific tournament rule will apply only to the extent it expressly addresses the relevant tournament matter and does not conflict with applicable law.
              </p>
            </section>

            {/* 30 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">30. CONTACT INFORMATION</h2>
              <p className="text-slate-400 mb-1.5">
                For questions, complaints, legal notices, or support relating to these Terms, contact:
              </p>
              <div className="border-t border-b border-white/10 py-2.5 my-2 space-y-0.5 text-xs text-slate-300">
                <p><strong className="text-white">BattleHub</strong></p>
                <p>Legal & Compliance Desk</p>
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