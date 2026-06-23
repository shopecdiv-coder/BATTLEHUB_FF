import React, { useState, useEffect } from "react";
import { AIKnowledge } from "@/entities/AIKnowledge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Plus, Trash2, Save, Eye, EyeOff, Edit } from "lucide-react";

export default function AIKnowledgeManager() {
  const [knowledge, setKnowledge] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "General",
    priority: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await AIKnowledge.list("-priority").catch(() => []);
    setKnowledge(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      alert("Title and content required");
      return;
    }

    if (editing) {
      await AIKnowledge.update(editing.id, form);
    } else {
      await AIKnowledge.create(form);
    }

    setForm({ title: "", content: "", category: "General", priority: 0, is_active: true });
    setEditing(null);
    setShowForm(false);
    await loadData();
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title,
      content: item.content,
      category: item.category,
      priority: item.priority,
      is_active: item.is_active
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this knowledge?")) {
      await AIKnowledge.delete(id);
      await loadData();
    }
  };

  const toggleActive = async (item) => {
    await AIKnowledge.update(item.id, { is_active: !item.is_active });
    await loadData();
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-white">AI Knowledge Base</CardTitle>
          </div>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              setEditing(null);
              setForm({ title: "", content: "", category: "General", priority: 0, is_active: true });
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Knowledge
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-purple-300 text-sm font-semibold mb-2">📚 AI को कैसे train करें?</p>
          <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
            <li>Title में topic का naam लिखें (e.g., "Prize Distribution Process")</li>
            <li>Content में पूरा detail paragraph लिखें</li>
            <li>AI इस text को analyze करके users को answer देगा</li>
            <li>जितना ज़्यादा detail देंगे, उतना accurate AI answer देगा</li>
          </ol>
        </div>

        {showForm && (
          <div className="p-4 bg-gray-900/50 rounded-lg border border-purple-500/30 space-y-3">
            <div>
              <Label className="text-gray-300">Title (Topic)</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
                placeholder="e.g., Prize Kab Milega"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Content (Full Paragraph)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({...form, content: e.target.value})}
                placeholder="पूरी detail में explain करें... AI यह information use करेगा answers में"
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                rows={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Example: "Prize distribution 24-72 hours में होता है match complete होने के बाद. Admin manually verify करते हैं results को और फिर coins credit करते हैं winner के wallet में."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tournament">Tournament</SelectItem>
                    <SelectItem value="Registration">Registration</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Rules">Rules</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({...form, priority: parseInt(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 flex-1">
                <Save className="w-4 h-4 mr-2" /> {editing ? "Update" : "Save"}
              </Button>
              <Button onClick={() => {
                setShowForm(false);
                setEditing(null);
              }} variant="outline" className="border-gray-600">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {knowledge.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No knowledge yet. Add some to train AI!</p>
          ) : (
            knowledge.map(item => (
              <div key={item.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">{item.category}</Badge>
                      <Badge className={item.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"} className="text-xs">
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">Priority: {item.priority}</Badge>
                    </div>
                    <p className="text-white font-bold text-sm mb-1">📌 {item.title}</p>
                    <p className="text-gray-400 text-xs line-clamp-3">{item.content}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 p-0 text-blue-400"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive(item)}
                      className="h-8 w-8 p-0"
                    >
                      {item.is_active ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 p-0 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}