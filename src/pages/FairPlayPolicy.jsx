import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FairPlayPolicy() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "fair_play_policy" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading fair play policy:", error);
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
            FAIR PLAY & ANTI-CHEAT POLICY
          </h1>
          <div className="text-xs text-slate-400 space-y-0.5">
            <p><strong>Effective Date:</strong> 30 August 2026</p>
            <p><strong>Last Updated:</strong> 30 August 2026</p>
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
              <p className="text-slate-400">
                BattleHub is committed to maintaining a fair, competitive, and transparent esports environment.
              </p>
              <p className="font-semibold text-white">
                Every player is expected to compete honestly and respect the rules of the relevant game, tournament, and BattleHub Platform.
              </p>
            </div>

            <hr className="border-white/10" />

            {/* 1 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">1. Fair Play Principle</h2>
              <p className="text-slate-400 mb-1.5">
                All participants must compete using their own skill, strategy, teamwork, reaction, game knowledge, and legitimate game mechanics.
              </p>
              <p className="text-slate-400">
                Any attempt to obtain an unfair competitive advantage may result in penalties, disqualification, prize cancellation, suspension, or permanent account termination.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">2. Prohibited Software and Tools</h2>
              <p className="text-slate-400">
                Players must not use hacks, cheats, scripts, bots, injectors, unauthorized game modifications, exploits, automation tools, unauthorized macros, third-party tools that provide an unfair competitive advantage, or any other prohibited software.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">3. Exploiting Game Bugs</h2>
              <p className="text-slate-400 mb-1.5">
                Knowingly abusing a game bug, glitch, exploit, or unintended mechanic to obtain an unfair advantage is prohibited.
              </p>
              <p className="text-slate-400">
                Players must report serious or tournament-impacting exploits to the Tournament Organizer or BattleHub where reasonably possible.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">4. Account Sharing</h2>
              <p className="text-slate-400 mb-1.5">
                Players must use their own registered gaming account.
              </p>
              <p className="text-slate-400">
                The following may result in disciplinary action: sharing an account, playing through another player&rsquo;s account, allowing another person to play on your registered account, selling or transferring tournament participation, or using another person&rsquo;s identity or UID.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">5. Collusion and Teaming</h2>
              <p className="text-slate-400 mb-1.5">
                Players must not cooperate with opponents in a manner prohibited by the tournament rules.
              </p>
              <p className="text-slate-400">
                Prohibited conduct includes intentional cooperation between opposing teams, sharing enemy locations or information, deliberately avoiding attacks, coordinating kills or placements, match manipulation, or any arrangement designed to influence tournament results unfairly.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">6. Match Fixing</h2>
              <p className="text-slate-400 mb-1.5">
                Any attempt to intentionally manipulate the outcome of a match, leaderboard, qualification, or prize result is strictly prohibited.
              </p>
              <p className="text-slate-400">
                This includes agreements between players, teams, organizers, or other persons to produce a predetermined result.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">7. Impersonation and False Information</h2>
              <p className="text-slate-400">
                Players must not impersonate another player, register using another person&rsquo;s UID, submit false identity information, submit fraudulent verification documents, or manipulate account information to bypass eligibility restrictions.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">8. Emulator, Device and Network Rules</h2>
              <p className="text-slate-400 mb-1.5">
                Where a tournament prohibits emulators, virtual environments, specific devices, or other technologies, players must comply with those restrictions.
              </p>
              <p className="text-slate-400">
                VPNs, proxies, virtual environments, device manipulation, or similar technologies must not be used to bypass geographical, security, eligibility, or tournament restrictions.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">9. Stream Sniping and Unfair Information</h2>
              <p className="text-slate-400">
                Players must not intentionally obtain or use confidential information from live streams, spectator feeds, private communications, observer information, or other unauthorized sources to gain an unfair competitive advantage.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">10. Unauthorized Spectators</h2>
              <p className="text-slate-400">
                Players must not use unauthorized spectators, observers, accounts, or third parties to obtain information about opponents during a live competition.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">11. Evidence and Reports</h2>
              <p className="text-slate-400 mb-1.5">
                Players may report suspected violations through BattleHub support or the designated tournament reporting mechanism. Reports should contain, where possible: tournament name, match information, player and team details, a description of the suspected violation, screenshots, video recordings, match recordings, or other relevant evidence.
              </p>
              <p className="text-slate-400">
                False, malicious, or intentionally misleading reports may themselves constitute a violation.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">12. Investigation</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub or the authorized Tournament Organizer may investigate suspected violations using available information, including match records, tournament logs, device and session information, room-entry records, game-related telemetry available to BattleHub, screenshots and recordings, player reports, account activity, and other relevant evidence.
              </p>
              <p className="text-slate-400">
                Players may be temporarily restricted from participation while a serious investigation is ongoing.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">13. Penalties</h2>
              <p className="text-slate-400 mb-1.5">
                Depending on the seriousness and circumstances of the violation, BattleHub may impose one or more penalties including a warning, match penalty, score adjustment, match disqualification, tournament disqualification, prize withholding, prize cancellation where legally permissible, temporary suspension, tournament participation restriction, permanent account termination, or a permanent ban.
              </p>
              <p className="text-slate-400">
                The penalty depends on the severity, evidence, history of violations, and impact on competitive integrity.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">14. Prize Protection</h2>
              <p className="text-slate-400 mb-1.5">
                Where cheating, fraud, or manipulation is established, BattleHub may withhold or cancel an affected prize where legally permissible.
              </p>
              <p className="text-slate-400">
                Where appropriate, BattleHub may review the results and determine whether an alternative eligible participant should receive the relevant position or prize under the tournament rules.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">15. Appeals</h2>
              <p className="text-slate-400 mb-1.5">
                A player affected by a disciplinary decision may submit an appeal where an appeal mechanism is available. Appeals should include account details, tournament and match details, the reason for appeal, relevant evidence, and any information that may assist the review.
              </p>
              <p className="text-slate-400">
                BattleHub reviews available evidence before making a final decision.
              </p>
            </section>

            {/* 16 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">16. Zero-Tolerance Conduct</h2>
              <p className="text-slate-400">
                Severe violations involving hacking, organized cheating, fraud, match fixing, identity manipulation, or repeated abuse may result in immediate suspension or permanent termination.
              </p>
            </section>

            {/* 17 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">17. Changes to Fair Play Rules</h2>
              <p className="text-slate-400 mb-1.5">
                BattleHub may update these rules when required due to changes in game mechanics, new cheating methods, security developments, tournament requirements, regulatory requirements, or changes to the Platform.
              </p>
              <p className="text-slate-400">
                The latest published version will apply to future tournaments unless otherwise stated.
              </p>
            </section>

            {/* Footer block */}
            <div className="border-t border-b border-white/10 py-2.5 my-2 space-y-0.5 text-xs text-slate-300">
              <p><strong className="text-white">BattleHub</strong></p>
              <p>Fair Play & Integrity Desk</p>
              <p><strong className="text-white">Email:</strong> <a href="mailto:contact@battlehub.site" className="text-orange-400 underline">contact@battlehub.site</a></p>
              <p><strong className="text-white">Location:</strong> Gautam Buddha Nagar, Greater Noida, Uttar Pradesh, India</p>
            </div>
            <p className="text-center text-xs text-slate-500 pt-3">
              &copy; 2026 BattleHub . All Rights Reserved.
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
