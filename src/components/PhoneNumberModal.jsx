import React, { useState } from "react";
import { User } from "@/entities/User";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";

export default function PhoneNumberModal({ user, onComplete }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setSaving(true);
    try {
      await User.updateMyUserData({ 
        phone: phoneNumber,
        mobile_number: phoneNumber
      });
      onComplete();
    } catch (err) {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={true}>
      <DialogContent className="bg-gray-900 border-blue-500/30 max-w-md" hideClose={true}>
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Phone Number Required</h3>
            <p className="text-gray-400 text-sm mt-2">We need your phone number for tournament updates and WhatsApp notifications</p>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-gray-300 mb-2">Mobile Number with Country Code</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value.replace(/\D/g, ''));
                setError("");
              }}
              placeholder="919876543210"
              type="tel"
              maxLength={12}
              className="bg-gray-800 border-gray-700 text-white text-lg text-center font-mono"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Example: 91 + Your 10 digit number
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !phoneNumber || phoneNumber.length < 10}
            className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold"
          >
            {saving ? "Saving..." : "Continue"}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            🔒 Your number is safe and used only for tournament notifications
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}