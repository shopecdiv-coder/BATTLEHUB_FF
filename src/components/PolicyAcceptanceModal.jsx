import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { LegalContent } from "@/entities/LegalContent";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, RefreshCw, Scale, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";


export default function PolicyAcceptanceModal() {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState(null);
  const [allPoliciesAccepted, setAllPoliciesAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [legalDocs, setLegalDocs] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAndShow();
  }, []);

  const checkAndShow = async () => {
    try {
      const currentUser = await User.me();
      
      // Show for ALL users who haven't accepted policies
      if (!currentUser.policies_accepted) {
        setUser(currentUser);
        setShow(true);
        
        // Load legal documents
        const docs = await LegalContent.list();
        const docsMap = {};
        docs.forEach(doc => {
          docsMap[doc.content_type] = doc;
        });
        setLegalDocs(docsMap);
      }
    } catch (error) {
      // User not logged in
    }
  };

  const handleAccept = async () => {
    if (!allPoliciesAccepted || !ageConfirmed) {
      alert("⚠️ Please accept all checkboxes to continue");
      return;
    }

    setSubmitting(true);
    try {
      await User.updateMyUserData({
        policies_accepted: true,
        policies_accepted_date: new Date().toISOString()
      });
      setShow(false);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save. Please try again.");
    }
    setSubmitting(false);
  };

  if (!show) return null;

  return (
    <>
      <Dialog open={show} onOpenChange={() => {}}>
        <DialogContent 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-orange-500/30 text-gray-100 max-w-3xl max-h-[95vh] overflow-y-auto" 
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b border-gray-700 pb-4">
            <DialogTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              Welcome to BattleHub FF
            </DialogTitle>
            <p className="text-gray-400 mt-2">Please review and accept the following to continue.</p>
          </DialogHeader>

          <div className="space-y-5 py-6">
            {/* Single Policy Agreement */}
            <div className="p-5 bg-gray-800/60 rounded-xl border-2 border-gray-700 hover:border-orange-500/50 transition-all">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={allPoliciesAccepted}
                  onCheckedChange={setAllPoliciesAccepted}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <label className="text-gray-100 font-semibold text-base block mb-2">
                    I have read and agree to all BattleHub FF policies, including:
                  </label>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Link to={createPageUrl("TermsConditions")} target="_blank" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">Terms & Conditions</Link>
                    <span className="text-gray-500">•</span>
                    <Link to={createPageUrl("PrivacyPolicy")} target="_blank" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">Privacy Policy</Link>
                    <span className="text-gray-500">•</span>
                    <Link to={createPageUrl("RefundPolicy")} target="_blank" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">Refund & Cancellation Policy</Link>
                    <span className="text-gray-500">•</span>
                    <Link to={createPageUrl("Rules")} target="_blank" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">Tournament Rules & Fair Play Policy</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Age Confirmation - Separate Box */}
            <div className="p-5 bg-orange-900/20 border-2 border-orange-500/50 rounded-xl shadow-lg">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={ageConfirmed}
                  onCheckedChange={setAgeConfirmed}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <label className="text-orange-300 font-bold text-base block mb-1">
                    🔞 Age Confirmation (18+)
                  </label>
                  <p className="text-gray-300 text-sm">
                    I confirm that I am 18 years of age or older and legally eligible to use this platform.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAccept}
              disabled={submitting || !allPoliciesAccepted || !ageConfirmed}
              className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 hover:from-orange-600 hover:via-red-600 hover:to-orange-600 text-white font-black py-7 text-xl shadow-2xl shadow-orange-500/30 disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Accept & Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      {viewingDoc && (
        <Dialog open={true} onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-100">{viewingDoc.title}</DialogTitle>
            </DialogHeader>
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap text-sm">
              {viewingDoc.content}
            </div>
            <Button onClick={() => setViewingDoc(null)} className="w-full">Close</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function PolicyCheckbox({ checked, onChange, label, icon: Icon, onView }) {
  return (
    <div className="flex items-center justify-between p-5 bg-gray-800/60 rounded-xl border-2 border-gray-700 hover:border-orange-500/50 hover:bg-gray-800 transition-all shadow-lg">
      <div className="flex items-center gap-4">
        <Checkbox
          checked={checked}
          onCheckedChange={onChange}
          className="w-5 h-5"
        />
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
        <label className="text-gray-100 font-bold cursor-pointer text-lg">
          {label}
        </label>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onView}
        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-semibold"
      >
        📖 Read
      </Button>
    </div>
  );
}