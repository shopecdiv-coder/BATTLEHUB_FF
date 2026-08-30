import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Rules() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "rules" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading rules:", error);
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
            BATTLEHUB TOURNAMENT RULES
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
                These Tournament Rules establish the standard requirements for participating in tournaments hosted, managed, or facilitated through BattleHub.
              </p>
              <p className="font-semibold text-white">
                Individual tournaments may contain additional rules. Participants must always follow the specific rules displayed on the relevant tournament page.
              </p>
            </div>

            <hr className="border-white/10" />

            {/* 1 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">1. Registration</h2>
              <p className="text-slate-400 mb-1.5">
                Participants must register using accurate information, use their own BattleHub account, provide the correct in-game UID, meet the tournament&rsquo;s eligibility requirements, complete required verification before the applicable deadline, and follow all registration instructions.
              </p>
              <p className="text-slate-400">
                Providing incorrect or misleading information may result in disqualification.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">2. Eligibility</h2>
              <p className="text-slate-400 mb-1.5">
                Each tournament may specify its own age requirement, game account requirements, rank or level requirements, account-age requirements, region restrictions, device requirements, team requirements, and verification requirements.
              </p>
              <p className="text-slate-400">
                Participants are responsible for checking eligibility before registering.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">3. Check-In</h2>
              <p className="text-slate-400 mb-1.5">
                Where check-in is required, participants must complete check-in within the specified time.
              </p>
              <p className="text-slate-400">
                Failure to check in may result in removal from the tournament, loss of the allocated slot, or disqualification without refund, subject to the applicable Refund Policy.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">4. Match Participation</h2>
              <p className="text-slate-400 mb-1.5">
                Players must join the assigned match using the correct account and information.
              </p>
              <p className="text-slate-400">
                Participants must join the correct room or lobby, follow the published schedule, use the registered account, follow game-specific rules, and follow instructions from authorized tournament administrators.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">5. Room ID and Password</h2>
              <p className="text-slate-400 mb-1.5">
                Room or lobby credentials are intended only for registered participants.
              </p>
              <p className="text-slate-400">
                Participants must not share room credentials publicly, sell or distribute access, allow unauthorized players to enter, or attempt to obtain unauthorized access.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">6. Scoring and Leaderboards</h2>
              <p className="text-slate-400 mb-1.5">
                Scores will be calculated according to the scoring system published for the particular tournament. Depending on the tournament, scoring may consider kills, placement, match wins, objectives, round results, or other published criteria.
              </p>
              <p className="text-slate-400">
                BattleHub or the Tournament Organizer may correct leaderboard errors where verified evidence shows that a result was incorrectly recorded.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">7. Tie-Breakers</h2>
              <p className="text-slate-400 mb-1.5">
                If two or more participants have the same score, the tournament may use predetermined tie-breaker criteria such as higher placement, higher number of kills or objectives, better result in the specified previous match, head-to-head result where applicable, or other tie-breaking criteria published for the tournament.
              </p>
              <p className="text-slate-400">
                The specific tournament page will determine the applicable tie-breaker.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">8. Disconnection</h2>
              <p className="text-slate-400 mb-1.5">
                Players are responsible for maintaining a suitable device and internet connection. A disconnection caused by the player&rsquo;s own device, internet connection, battery, game application, account, background application, or network configuration will generally not require a match restart or refund.
              </p>
              <p className="text-slate-400">
                A restart or rescheduling may be considered where the issue affects the tournament broadly or results from a verified platform or game-server problem.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">9. Prohibited Conduct</h2>
              <p className="text-slate-400 mb-1.5">
                Participants must not cheat, hack, use prohibited scripts or software, exploit bugs, use unauthorized automation, share accounts, impersonate another player, collude, fix matches, manipulate results, use unauthorized spectators, stream snipe, harass tournament staff or players, or otherwise obtain an unfair competitive advantage.
              </p>
              <p className="text-slate-400">
                Detailed requirements are provided in the Fair Play & Anti-Cheat Policy.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">10. Sportsmanship</h2>
              <p className="text-slate-400 mb-1.5">
                Players must maintain professional conduct toward other players, teams, tournament organizers, BattleHub staff, moderators, and community members.
              </p>
              <p className="text-slate-400">
                Threats, harassment, abusive behavior, discrimination, spam, and intentional disruption are strictly prohibited.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">11. Tournament Administration</h2>
              <p className="text-slate-400">
                Authorized BattleHub administrators or Tournament Organizers may verify participants, monitor tournament activity, review match evidence, correct administrative errors, apply penalties, resolve tournament disputes, postpone or restart matches where necessary, and take reasonable action to protect competitive integrity.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">12. Match Cancellation or Restart</h2>
              <p className="text-slate-400">
                A match may be restarted, postponed, or cancelled where reasonably necessary due to major technical failure, game-server problems, security incidents, incorrect room configuration, administrative error, cheating affecting the match, or other circumstances materially affecting competitive fairness.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">13. Results and Prize Distribution</h2>
              <p className="text-slate-400 mb-1.5">
                Final results may be subject to verification before prizes are distributed. Prize distribution may require result verification, anti-cheat review, identity or KYC verification, correct payment information, and compliance with applicable law.
              </p>
              <p className="text-slate-400">
                BattleHub may delay distribution while a legitimate investigation is pending.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">14. Disqualification</h2>
              <p className="text-slate-400 mb-1.5">
                A participant may be disqualified for rule violations, cheating, fraud, false information, failure to meet eligibility requirements, unauthorized account use, match manipulation, abusive conduct, or other conduct that materially compromises tournament integrity.
              </p>
              <p className="text-slate-400">
                Disqualification may affect eligibility for prizes and refunds according to the applicable policies.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">15. Disputes</h2>
              <p className="text-slate-400 mb-1.5">
                Players should report tournament disputes as soon as reasonably possible through the designated BattleHub support or tournament reporting channel. A dispute should include tournament name, match number, player and team details, a description of the issue, and supporting evidence.
              </p>
              <p className="text-slate-400">
                BattleHub or the Tournament Organizer may review available records before determining the outcome.
              </p>
            </section>

            {/* 16 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">16. Final Tournament Decisions</h2>
              <p className="text-slate-400">
                Authorized tournament administrators may make operational decisions necessary to maintain fairness and tournament continuity. Where an appeal process is available, affected participants may submit an appeal according to the applicable procedure.
              </p>
            </section>

            {/* 17 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">17. Rule Changes</h2>
              <p className="text-slate-400">
                BattleHub or the Tournament Organizer may modify tournament rules before or during a tournament where reasonably necessary because of technical problems, security concerns, game updates, regulatory requirements, incorrectly published information, or other circumstances affecting fair competition. Material changes will be communicated to participants where reasonably possible.
              </p>
            </section>

            {/* 18 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">18. Acceptance</h2>
              <p className="text-slate-400">
                By registering for or participating in a BattleHub tournament, you confirm that you have read the applicable tournament rules, agree to comply with the Fair Play & Anti-Cheat Policy, agree to the BattleHub Terms & Conditions, agree to the applicable Refund & Cancellation Policy, and accept the decisions and procedures established to maintain fair competition, subject to applicable law.
              </p>
            </section>

            {/* Footer block */}
            <div className="border-t border-b border-white/10 py-2.5 my-2 space-y-0.5 text-xs text-slate-300">
              <p><strong className="text-white">BattleHub</strong></p>
              <p>Tournament Operations Desk</p>
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