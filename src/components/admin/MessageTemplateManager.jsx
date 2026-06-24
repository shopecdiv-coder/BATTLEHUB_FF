import React, { useState, useEffect } from "react";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Plus, Trash2, Send, Copy, Check, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = [
  "Account & User",
  "Tournament",
  "Match Result",
  "Wallet / Coins",
  "System & Admin",
  "Promotion & Engagement"
];

const PREDEFINED_TEMPLATES = [
  // Account & User
  { category: "Account & User", name: "Account Registration Successful", message: "🎉 *WELCOME TO BATTLEHUB FF*\n\nDear *{name}*,\n\nYour account has been successfully registered!\n\n✅ Registration Date: {date}\n📧 Email: {email}\n🆔 Unique ID: {unique_id}\n\nThank you for joining BattleHub FF!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "date", "email", "unique_id"] },
  { category: "Account & User", name: "Login Alert", message: "🔐 *NEW LOGIN DETECTED*\n\nHi *{name}*,\n\nYour account was accessed on {date} at {time}.\n\nIf this wasn't you, please secure your account immediately.\n\n*BATTLEHUB FF TEAM*", variables: ["name", "date", "time"] },
  { category: "Account & User", name: "Profile Update Confirmation", message: "✅ *PROFILE UPDATED*\n\nHi *{name}*,\n\nYour profile has been successfully updated on {date} at {time}.\n\nThank you!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "date", "time"] },
  
  // Tournament
  { category: "Tournament", name: "Tournament Registration Successful", message: "🏆 *BATTLEHUB FF TOURNAMENT*\n━━━━━━━━━━━━━━━━━━━━\n\n✅ *REGISTRATION SUCCESSFULLY COMPLETED*\n\nDear *{name}*,\n\nCongratulations! Your tournament registration has been confirmed.\n\n📋 *TOURNAMENT DETAILS*\n━━━━━━━━━━━━━━━━━━━━\n🎮 Tournament: *{tournament_name}*\n👥 Mode: *{mode}*\n📅 Date: *{date}*\n⏰ Time: *{time}*\n\n⚠️ *IMPORTANT GUIDELINES*\n━━━━━━━━━━━━━━━━━━━━\n✓ Room ID & Password will be shared 15 minutes before match\n✓ Join the room on time - Late entries will be rejected\n✓ Fair play is mandatory - Cheating leads to permanent ban\n✓ Follow all tournament rules strictly\n\n📞 *SUPPORT & CONTACT*\n━━━━━━━━━━━━━━━━━━━━\n🌐 Website: https://battlehubff.site\n📧 Email: helpbattlehub@gmail.com\n\n🎯 Best of luck for the tournament!\n\n*BattleHub FF Team*\n_Official Esports Tournament Platform_", variables: ["name", "tournament_name", "mode", "date", "time"] },
  { category: "Tournament", name: "Match Reminder", message: "⏰ *MATCH STARTING SOON*\n\nHi *{name}*,\n\nYour tournament *{tournament_name}* starts in {minutes} minutes!\n\n🎮 Mode: {mode}\n📅 Date: {date}\n⏰ Time: {time}\n\nGet ready!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name", "minutes", "mode", "date", "time"] },
  { category: "Tournament", name: "Room ID & Password", message: "🔑 *ROOM DETAILS*\n━━━━━━━━━━━━━━━━━━━━\n\n*{tournament_name}*\n\n🆔 *Room ID*: {room_id}\n🔐 *Password*: {room_password}\n\n⏰ *Match Time*: {time}\n\n⚠️ Join on time - Late entry will NOT be allowed!\n\nGood Luck! 🎯\n\n*BATTLEHUB FF TEAM*", variables: ["tournament_name", "room_id", "room_password", "time"] },
  { category: "Tournament", name: "Tournament Rescheduled", message: "📅 *TOURNAMENT RESCHEDULED*\n\nHi *{name}*,\n\n*{tournament_name}* has been rescheduled.\n\n🔄 New Date: {new_date}\n🕐 New Time: {new_time}\n\nSorry for the inconvenience!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name", "new_date", "new_time"] },
  { category: "Tournament", name: "Tournament Cancelled", message: "❌ *TOURNAMENT CANCELLED*\n\nHi *{name}*,\n\nUnfortunately, *{tournament_name}* has been cancelled.\n\nYour entry fee will be refunded within 24 hours.\n\nSorry for the inconvenience!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name"] },
  { category: "Tournament", name: "Tournament Completed", message: "🏁 *TOURNAMENT COMPLETED*\n\nHi *{name}*,\n\n*{tournament_name}* has been completed!\n\nResults will be announced soon.\n\nThank you for participating! 🎮\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name"] },
  
  // Match Result
  { category: "Match Result", name: "Match Win", message: "🏆 *CONGRATULATIONS!*\n\nHi *{name}*,\n\nYou won *{tournament_name}*!\n\n🥇 Position: {position}\n💰 Prize: ₹{prize}\n\nPrize will be credited within 24 hours.\n\nCongratulations! 🎉\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name", "position", "prize"] },
  { category: "Match Result", name: "Match Participation", message: "🎮 *MATCH COMPLETED*\n\nHi *{name}*,\n\nThank you for participating in *{tournament_name}*!\n\n📊 Your Position: {position}\n🎯 Kills: {kills}\n\nKeep playing and winning! 💪\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name", "position", "kills"] },
  { category: "Match Result", name: "Result Announced", message: "📢 *RESULTS ANNOUNCED*\n\nHi *{name}*,\n\nResults for *{tournament_name}* are now live!\n\nCheck your dashboard to view complete results.\n\n🌐 https://battlehubff.site\n\n*BATTLEHUB FF TEAM*", variables: ["name", "tournament_name"] },
  
  // Wallet / Coins
  { category: "Wallet / Coins", name: "Coin Purchase Successful", message: "✅ *PAYMENT VERIFIED*\n\nHi *{name}*,\n\nYour coin purchase has been verified!\n\n💰 Amount: ₹{amount}\n🪙 Coins Credited: {coins}\n\nThank you for your purchase!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "amount", "coins"] },
  { category: "Wallet / Coins", name: "Coin Purchase Failed", message: "❌ *PAYMENT FAILED*\n\nHi *{name}*,\n\nYour payment for ₹{amount} could not be verified.\n\nReason: {reason}\n\nPlease contact support if amount was deducted.\n\n*BATTLEHUB FF TEAM*", variables: ["name", "amount", "reason"] },
  { category: "Wallet / Coins", name: "Wallet Debit", message: "💸 *COINS DEDUCTED*\n\nHi *{name}*,\n\n🪙 {coins} coins deducted from your wallet.\n\nReason: {reason}\n\nCheck your wallet for details.\n\n*BATTLEHUB FF TEAM*", variables: ["name", "coins", "reason"] },
  { category: "Wallet / Coins", name: "Wallet Credit", message: "💰 *COINS CREDITED*\n\nHi *{name}*,\n\n🪙 {coins} coins added to your wallet!\n\nReason: {reason}\n\nEnjoy!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "coins", "reason"] },
  { category: "Wallet / Coins", name: "Refund Processed", message: "♻️ *REFUND PROCESSED*\n\nHi *{name}*,\n\nYour refund of ₹{amount} has been processed.\n\nIt will reflect in your account within 2-3 business days.\n\nThank you for your patience!\n\n*BATTLEHUB FF TEAM*", variables: ["name", "amount"] },
  
  // System & Admin
  { category: "System & Admin", name: "Maintenance Notice", message: "🔧 *MAINTENANCE ALERT*\n\nDear Users,\n\nScheduled maintenance on {date} from {start_time} to {end_time}.\n\nServices will be temporarily unavailable.\n\nSorry for the inconvenience!\n\n*BATTLEHUB FF TEAM*", variables: ["date", "start_time", "end_time"] },
  { category: "System & Admin", name: "Important Announcement", message: "📢 *IMPORTANT ANNOUNCEMENT*\n\n{announcement}\n\nFor more details, visit:\n🌐 https://battlehubff.site\n\n*BATTLEHUB FF TEAM*", variables: ["announcement"] },
  { category: "System & Admin", name: "Rule Update", message: "📋 *RULES UPDATED*\n\nDear Users,\n\nOur tournament rules have been updated.\n\nPlease review the new rules on our website before participating.\n\n🌐 https://battlehubff.site/rules\n\n*BATTLEHUB FF TEAM*", variables: [] },
  
  // Promotion & Engagement
  { category: "Promotion & Engagement", name: "New Tournament Announcement", message: "🎉 *NEW TOURNAMENT ALERT*\n\n*{tournament_name}* is now open!\n\n📅 Date: {date}\n⏰ Time: {time}\n💰 Prize Pool: ₹{prize_pool}\n\nRegister now!\n🌐 https://battlehubff.site\n\n*BATTLEHUB FF TEAM*", variables: ["tournament_name", "date", "time", "prize_pool"] },
  { category: "Promotion & Engagement", name: "Refer & Earn", message: "🎁 *REFER & EARN*\n\nHi *{name}*,\n\nInvite friends and earn rewards!\n\nYour Referral Code: {referral_code}\n\nShare now and start earning! 💰\n\n*BATTLEHUB FF TEAM*", variables: ["name", "referral_code"] },
  { category: "Promotion & Engagement", name: "Special Event Alert", message: "🎊 *SPECIAL EVENT*\n\n{event_name} is here!\n\n🎁 {event_details}\n\nDon't miss out!\n🌐 https://battlehubff.site\n\n*BATTLEHUB FF TEAM*", variables: ["event_name", "event_details"] }
];

export default function MessageTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    category: "",
    template_name: "",
    message_template: "",
    description: "",
    variables: []
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [users, setUsers] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadTemplates();
    loadUsers();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await MessageTemplate.list("-created_date");
      setTemplates(allTemplates || []);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const allUsers = await User.list("-created_date", 200);
      setUsers(allUsers || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const createPredefinedTemplates = async () => {
    setLoading(true);
    try {
      for (const template of PREDEFINED_TEMPLATES) {
        await MessageTemplate.create({
          category: template.category,
          template_name: template.name,
          message_template: template.message,
          description: `Predefined template for ${template.name}`,
          variables: template.variables,
          is_active: true
        });
      }
      await loadTemplates();
      alert("✅ All predefined templates created!");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create templates");
    }
    setLoading(false);
  };

  const extractVariables = (text) => {
    const matches = text.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  const handleSave = async () => {
    if (!formData.category || !formData.template_name || !formData.message_template) {
      alert("Please fill required fields");
      return;
    }

    const variables = extractVariables(formData.message_template);

    try {
      if (editingTemplate) {
        await MessageTemplate.update(editingTemplate.id, {
          ...formData,
          variables
        });
        alert("✅ Template updated!");
      } else {
        await MessageTemplate.create({
          ...formData,
          variables,
          is_active: true
        });
        alert("✅ Template created!");
      }
      setFormData({ category: "", template_name: "", message_template: "", description: "", variables: [] });
      setEditingTemplate(null);
      await loadTemplates();
    } catch (error) {
      alert("Failed to save template");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await MessageTemplate.delete(id);
      await loadTemplates();
      alert("✅ Template deleted!");
    } catch (error) {
      alert("Failed to delete");
    }
  };

  const copyTemplate = (template) => {
    navigator.clipboard.writeText(template.message_template);
    setCopied(template.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      (t.template_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.message_template || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">Message Templates</h2>
          <Badge className="bg-cyan-500/20 text-cyan-400">{templates.length}</Badge>
        </div>
        {templates.length === 0 && (
          <Button onClick={createPredefinedTemplates} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Create All Predefined Templates
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create/Edit Form */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                placeholder="e.g., Tournament Registration Successful"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Message Template *</Label>
              <Textarea
                value={formData.message_template}
                onChange={(e) => setFormData({...formData, message_template: e.target.value})}
                placeholder="Use {name}, {tournament_name}, {date}, {time}, {amount}, {coins}, etc. for dynamic values"
                className="bg-gray-700 border-gray-600 text-white h-48 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use &#123;variable_name&#125; for dynamic values. Variables: name, tournament_name, date, time, amount, coins, room_id, room_password, etc.
              </p>
            </div>

            <div>
              <Label className="text-gray-300">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of this template"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
              {editingTemplate && (
                <Button onClick={() => { setEditingTemplate(null); setFormData({ category: "", template_name: "", message_template: "", description: "", variables: [] }); }} variant="outline">
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">All Templates</CardTitle>
            <div className="flex gap-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="bg-gray-700 border-gray-600 text-white pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No templates found</p>
            ) : (
              filteredTemplates.map(template => (
                <div key={template.id} className="p-4 bg-gray-700/50 rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{template.template_name}</h4>
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs mt-1">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyTemplate(template)}
                        className="h-8 w-8 p-0"
                      >
                        {copied === template.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTemplate(template);
                          setFormData({
                            category: template.category,
                            template_name: template.template_name,
                            message_template: template.message_template,
                            description: template.description || "",
                            variables: template.variables || []
                          });
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Mail className="w-4 h-4 text-blue-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(template.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-3">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                      {(template.message_template || "").substring(0, 200)}{(template.message_template || "").length > 200 ? '...' : ''}
                    </pre>
                  </div>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((v, i) => (
                        <Badge key={i} className="bg-cyan-500/20 text-cyan-400 text-[10px]">
                          &#123;{v}&#125;
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Guide */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">📖 How to Use Templates</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 text-sm space-y-2">
          <p>• Use curly braces for dynamic variables: <code className="bg-gray-900 px-2 py-1 rounded">&#123;name&#125;</code>, <code className="bg-gray-900 px-2 py-1 rounded">&#123;tournament_name&#125;</code></p>
          <p>• Common variables: name, tournament_name, date, time, amount, coins, room_id, room_password, position, kills, prize</p>
          <p>• When sending messages from User Management, template variables will auto-fill with user data</p>
          <p>• Copy templates and customize them before sending to users</p>
        </CardContent>
      </Card>
    </div>
  );
}