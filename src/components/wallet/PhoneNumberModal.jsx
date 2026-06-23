import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, AlertTriangle } from "lucide-react";
import { User } from "@/entities/User";

export default function PhoneNumberModal({ open, onClose, user, onPhoneSaved }) {
  const [phone, setPhone] = useState(user?.mobile_number || user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    // Validate phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanedPhone = phone.replace(/\D/g, '');
    
    if (!phoneRegex.test(cleanedPhone)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    setSaving(true);
    try {
      await User.update(user.id, { 
        mobile_number: `+91${cleanedPhone}`,
        phone: `+91${cleanedPhone}`
      });
      onPhoneSaved(`+91${cleanedPhone}`);
      onClose();
    } catch (error) {
      setError("Failed to save phone number");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
        <div className="space-y-6 p-2">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Phone Number Required</h3>
            <p className="text-gray-400 text-sm">
              Please provide your phone number to access wallet features and receive important updates
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Mobile Number *</Label>
              <div className="flex gap-2">
                <div className="w-16 h-10 bg-gray-800 border border-gray-700 rounded-md flex items-center justify-center text-gray-400 text-sm">
                  +91
                </div>
                <Input
                  type="tel"
                  value={phone.replace('+91', '')}
                  onChange={(e) => {
                    setError("");
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  }}
                  placeholder="9876543210"
                  className="bg-gray-800 border-gray-700 text-white flex-1"
                  maxLength={10}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <p>{error}</p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                This number will be used for important notifications and WhatsApp updates
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || phone.replace(/\D/g, '').length !== 10}
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
            >
              {saving ? "Saving..." : "Continue to Wallet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}