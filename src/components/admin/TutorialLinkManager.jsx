import React, { useState, useEffect } from "react";
import { AppSettings } from "@/entities/AppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Youtube, Save, Trash2 } from "lucide-react";

export default function TutorialLinkManager() {
  const [tutorialLink, setTutorialLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTutorialLink();
  }, []);

  const loadTutorialLink = async () => {
    setLoading(true);
    try {
      const settings = await AppSettings.filter({ setting_key: "wallet_tutorial_link" });
      if (settings.length > 0) {
        setTutorialLink(settings[0].setting_value || "");
      }
    } catch (error) {
      console.error("Error loading tutorial link:", error);
    }
    setLoading(false);
  };

  const saveTutorialLink = async () => {
    setSaving(true);
    try {
      const settings = await AppSettings.filter({ setting_key: "wallet_tutorial_link" });
      
      if (settings.length > 0) {
        await AppSettings.update(settings[0].id, {
          setting_value: tutorialLink,
          is_enabled: true
        });
      } else {
        await AppSettings.create({
          setting_key: "wallet_tutorial_link",
          setting_value: tutorialLink,
          is_enabled: true,
          description: "YouTube tutorial link for buying coins"
        });
      }
      
      alert("✅ Tutorial link saved!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Youtube className="w-6 h-6 text-red-400" />
        <h2 className="text-xl font-bold text-white">Wallet Tutorial Link</h2>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">YouTube Tutorial for Buying Coins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">YouTube Video Link</Label>
            <Input
              value={tutorialLink}
              onChange={(e) => setTutorialLink(e.target.value)}
              placeholder="https://youtu.be/YOUR_VIDEO_ID or https://www.youtube.com/watch?v=..."
              className="bg-gray-700 border-gray-600 text-white"
            />
            <p className="text-xs text-gray-500 mt-2">
              This link will appear in the Wallet page as "Need Help?" button
            </p>
          </div>

          {tutorialLink && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
              <p className="text-green-400 text-sm">
                ✓ Tutorial link will be shown to users in Wallet page
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={saveTutorialLink}
              disabled={saving || !tutorialLink}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Tutorial Link"}
            </Button>
            
            {tutorialLink && (
              <Button
                onClick={async () => {
                  if (confirm("Remove tutorial link from wallet page?")) {
                    setSaving(true);
                    try {
                      const settings = await AppSettings.filter({ setting_key: "wallet_tutorial_link" });
                      if (settings.length > 0) {
                        await AppSettings.update(settings[0].id, {
                          setting_value: "",
                          is_enabled: false
                        });
                      }
                      setTutorialLink("");
                      alert("✅ Tutorial link removed!");
                    } catch (error) {
                      alert("Failed to remove");
                    }
                    setSaving(false);
                  }
                }}
                disabled={saving}
                variant="destructive"
                className="px-6"
              >
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}