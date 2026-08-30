import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RefundPolicy() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "refund_policy" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading refund policy:", error);
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
            REFUND & CANCELLATION POLICY
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
                This Refund & Cancellation Policy (&ldquo;Policy&rdquo;) governs refunds, cancellations, failed transactions, and other payment-related matters on the BattleHub Platform.
              </p>
            </div>

            <hr className="border-white/10" />

            {/* 1 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">1. Tournament Entry Fees</h2>
              <p className="text-slate-400 mb-1.5">
                Once a player successfully registers for a tournament, the entry fee is generally non-refundable, except where a refund is specifically provided under this Policy, the applicable tournament rules, or required by law.
              </p>
              <p className="text-slate-400">
                No refund will generally be provided where the player voluntarily leaves the tournament, fails to check in or join the match, provides incorrect registration information, is disqualified for violating tournament rules, is found to have cheated or engaged in fraudulent activity, fails to participate due to their own device, internet, or account-related issue, or where the tournament has already commenced and the relevant service has been provided.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">2. Tournament Cancellation</h2>
              <p className="text-slate-400 mb-1.5">
                If BattleHub cancels a tournament before it begins for reasons attributable to BattleHub, eligible participants may receive a refund of the applicable entry fee.
              </p>
              <p className="text-slate-400">
                Where an independent Tournament Organizer cancels a tournament, the refund will be handled in accordance with the organizer&rsquo;s published refund terms and applicable law.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">3. Postponement or Rescheduling</h2>
              <p className="text-slate-400 mb-1.5">
                If a tournament is postponed or rescheduled, the existing registration may remain valid for the revised schedule.
              </p>
              <p className="text-slate-400">
                Where a refund is available due to the postponement or rescheduling, it will be processed according to the applicable tournament rules and this Policy.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">4. Technical Problems</h2>
              <p className="text-slate-400 mb-1.5">
                If a significant technical issue prevents a tournament from being conducted fairly, BattleHub or the Tournament Organizer may restart the affected match, reschedule the match, cancel the affected match, provide a full or partial refund where appropriate, or take another reasonable corrective action.
              </p>
              <p className="text-slate-400">
                Minor technical issues, player-side network problems, device problems, or game-server issues do not automatically qualify for a refund.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">5. Failed Payments</h2>
              <p className="text-slate-400 mb-1.5">
                If an amount is deducted from the user&rsquo;s bank account, card, or UPI account but the BattleHub transaction is unsuccessful, the transaction will be reviewed. Where the payment has been successfully received but the service was not credited, the applicable amount may be refunded or the service or credit may be restored.
              </p>
              <p className="text-slate-400">
                The time taken for the amount to appear in the user&rsquo;s account may depend on the bank, UPI provider, payment gateway, or other financial institution.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">6. Duplicate Payments</h2>
              <p className="text-slate-400">
                If a user is charged multiple times for the same transaction due to a technical or payment-processing error, the duplicate transaction will be reviewed. Once verified, the duplicate amount will be refunded through the applicable payment channel.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">7. Cheating or Disqualification</h2>
              <p className="text-slate-400 mb-1.5">
                Entry fees are generally non-refundable when a player is disqualified for hacking, cheating, scripts, unauthorized software, match fixing, collusion, account sharing, identity fraud, result manipulation, or other serious violations of BattleHub&rsquo;s Fair Play Policy.
              </p>
              <p className="text-slate-400">
                Any prize associated with such participation may also be withheld or cancelled where legally permissible.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">8. Wallet, Coins and Credits</h2>
              <p className="text-slate-400 mb-1.5">
                Where BattleHub provides digital coins, credits, or wallet functionality, the applicable terms will be displayed before purchase.
              </p>
              <p className="text-slate-400">
                Unless otherwise stated or required by law, successfully credited digital balances may not be refundable after purchase. Fraudulently obtained balances may be cancelled or reversed.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">9. Refund Request</h2>
              <p className="text-slate-400 mb-1.5">
                Refund requests should be submitted to <a href="mailto:contact@battlehub.site" className="text-orange-400 underline">contact@battlehub.site</a>.
              </p>
              <p className="text-slate-400">
                The request should include, where available: BattleHub username, registered email or mobile number, tournament name, transaction ID, payment reference or UTR, amount paid, date of transaction, reason for the request, and supporting evidence if applicable. BattleHub may request additional information to verify the transaction.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">10. Refund Processing</h2>
              <p className="text-slate-400">
                Approved refunds will normally be processed through the original payment method where technically and legally feasible. The time required for the refund to reach the user&rsquo;s account depends on the relevant payment provider, bank, card network, UPI system, or other financial institution.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">11. Chargebacks and Fraud</h2>
              <p className="text-slate-400">
                Users are encouraged to contact BattleHub support before initiating a chargeback where the issue can reasonably be resolved through our support process. Fraudulent transactions, unauthorized payment methods, false refund claims, or chargeback abuse may result in account restrictions or suspension, subject to applicable law.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">12. Legal Rights</h2>
              <p className="text-slate-400">
                Nothing in this Policy is intended to restrict any refund, cancellation, consumer, or statutory right that cannot legally be excluded under applicable Indian law.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-sm sm:text-base font-bold text-white mb-1.5">13. Contact</h2>
              <div className="border-t border-b border-white/10 py-2.5 my-2 space-y-0.5 text-xs text-slate-300">
                <p><strong className="text-white">BattleHub</strong></p>
                <p>Refund & Payment Support</p>
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
