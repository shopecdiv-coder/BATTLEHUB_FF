import React, { useState, useEffect } from "react";
import { AboutUsContent } from "@/entities/AboutUsContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Info } from "lucide-react";

export default function AboutUsManagement() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "Battle Hub",
    content: "",
    mission: "",
    vision: "",
    contact_email: "",
    contact_phone: "",
    social_links: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const docs = await AboutUsContent.list("-created_date", 1);
      if (docs.length > 0) {
        setContent(docs[0]);
        setForm(docs[0]);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (content) {
        await AboutUsContent.update(content.id, form);
      } else {
        await AboutUsContent.create(form);
      }
      await loadData();
      alert("✅ About Us page updated!");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          About Us Content (HTML Supported)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-300">Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({...form, title: e.target.value})}
            className="bg-gray-900 border-gray-700 text-white"
          />
        </div>

        <div>
          <Label className="text-gray-300">Content (HTML/Text Supported)</Label>
          <Textarea
            value={form.content}
            onChange={(e) => setForm({...form, content: e.target.value})}
            rows={15}
            placeholder="Enter full About Us content. Supports HTML tags like <h2>, <p>, <ul>, <strong>, <div>, etc. You can create multiple sections and customize fully."
            className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">💡 HTML Example: &lt;h2&gt;Our Mission&lt;/h2&gt;&lt;p&gt;Description...&lt;/p&gt;</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300">Mission</Label>
            <Textarea
              value={form.mission}
              onChange={(e) => setForm({...form, mission: e.target.value})}
              rows={3}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Vision</Label>
            <Textarea
              value={form.vision}
              onChange={(e) => setForm({...form, vision: e.target.value})}
              rows={3}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300">Contact Email</Label>
            <Input
              value={form.contact_email}
              onChange={(e) => setForm({...form, contact_email: e.target.value})}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Contact Phone</Label>
            <Input
              value={form.contact_phone}
              onChange={(e) => setForm({...form, contact_phone: e.target.value})}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !form.content}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save About Us Page"}
        </Button>
      </CardContent>
    </Card>
  );
}