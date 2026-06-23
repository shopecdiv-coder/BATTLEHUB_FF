import React, { useState, useEffect } from "react";
import { FAQ } from "@/entities/FAQ";
import { LegalContent } from "@/entities/LegalContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Save, X, FileText, Lock, Scale, HelpCircle } from "lucide-react";

export default function LegalFAQManagement() {
  const [faqs, setFaqs] = useState([]);
  const [legalDocs, setLegalDocs] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [showFAQForm, setShowFAQForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    category: "General",
    order: 0,
    is_active: true
  });

  const [docForm, setDocForm] = useState({
    content_type: "",
    title: "",
    content: "",
    version: "1.0"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allFAQs, allDocs] = await Promise.all([
        FAQ.list("order"),
        LegalContent.list()
      ]);
      setFaqs(allFAQs || []);
      
      const docsMap = {};
      (allDocs || []).forEach(doc => {
        docsMap[doc.content_type] = doc;
      });
      setLegalDocs(docsMap);
    } catch (error) {
      console.error("Error loading:", error);
    }
    setLoading(false);
  };

  // FAQ Management
  const handleSaveFAQ = async () => {
    try {
      if (editingFAQ) {
        await FAQ.update(editingFAQ.id, faqForm);
      } else {
        await FAQ.create(faqForm);
      }
      await loadData();
      resetFAQForm();
      alert("✅ FAQ saved!");
    } catch (error) {
      console.error("Error saving FAQ:", error);
      alert("Failed to save FAQ");
    }
  };

  const handleDeleteFAQ = async (id) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await FAQ.delete(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
    }
  };

  const resetFAQForm = () => {
    setFaqForm({
      question: "",
      answer: "",
      category: "General",
      order: 0,
      is_active: true
    });
    setEditingFAQ(null);
    setShowFAQForm(false);
  };

  // Legal Document Management
  const handleSaveDoc = async () => {
    try {
      const existing = legalDocs[docForm.content_type];
      const docData = {
        ...docForm,
        last_updated: new Date().toISOString()
      };
      
      if (existing) {
        await LegalContent.update(existing.id, docData);
      } else {
        await LegalContent.create(docData);
      }
      
      await loadData();
      setEditingDoc(null);
      alert("✅ Document saved!");
    } catch (error) {
      console.error("Error saving document:", error);
      alert("Failed to save document");
    }
  };

  const startEditDoc = (type) => {
    const doc = legalDocs[type];
    if (doc) {
      setDocForm({
        content_type: type,
        title: doc.title,
        content: doc.content,
        version: doc.version
      });
    } else {
      setDocForm({
        content_type: type,
        title: type === "privacy_policy" ? "Privacy Policy" : 
               type === "terms_conditions" ? "Terms & Conditions" : 
               type === "refund_policy" ? "Refund Policy" : 
               "Tournament Rules",
        content: "",
        version: "1.0"
      });
    }
    setEditingDoc(type);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="faq">FAQs ({faqs.length})</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
          <TabsTrigger value="refund">Refund Policy</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        {/* FAQ Management */}
        <TabsContent value="faq" className="mt-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-orange-400" />
                  FAQ Management
                </CardTitle>
                <Button onClick={() => setShowFAQForm(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* FAQ Form */}
              {showFAQForm && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white">{editingFAQ ? "Edit FAQ" : "Add New FAQ"}</h4>
                    <Button variant="ghost" size="sm" onClick={resetFAQForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-300">Question *</Label>
                      <Input
                        value={faqForm.question}
                        onChange={(e) => setFaqForm({...faqForm, question: e.target.value})}
                        placeholder="Enter question"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-300">Answer *</Label>
                      <Textarea
                        value={faqForm.answer}
                        onChange={(e) => setFaqForm({...faqForm, answer: e.target.value})}
                        placeholder="Enter detailed answer (supports line breaks)"
                        rows={5}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-gray-300">Category</Label>
                        <Select value={faqForm.category} onValueChange={(val) => setFaqForm({...faqForm, category: val})}>
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Prizes">Prizes</SelectItem>
                            <SelectItem value="Gameplay">Gameplay</SelectItem>
                            <SelectItem value="Coins">Coins</SelectItem>
                            <SelectItem value="Matches">Matches</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-gray-300">Order</Label>
                        <Input
                          type="number"
                          value={faqForm.order}
                          onChange={(e) => setFaqForm({...faqForm, order: parseInt(e.target.value) || 0})}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-gray-300">Active</Label>
                        <Select value={faqForm.is_active ? "true" : "false"} onValueChange={(val) => setFaqForm({...faqForm, is_active: val === "true"})}>
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={resetFAQForm} variant="outline" className="flex-1">Cancel</Button>
                    <Button onClick={handleSaveFAQ} className="flex-1 bg-green-600 hover:bg-green-700" disabled={!faqForm.question || !faqForm.answer}>
                      <Save className="w-4 h-4 mr-2" />
                      Save FAQ
                    </Button>
                  </div>
                </div>
              )}

              {/* FAQ List */}
              <div className="space-y-2">
                {faqs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No FAQs yet</p>
                ) : (
                  faqs.map((faq) => (
                    <div key={faq.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{faq.question}</p>
                          <p className="text-sm text-gray-400 mt-1">{faq.answer.substring(0, 100)}...</p>
                          <div className="flex gap-2 mt-2">
                            <Badge className="bg-orange-500/20 text-orange-400">{faq.category}</Badge>
                            {!faq.is_active && <Badge className="bg-gray-500/20 text-gray-400">Hidden</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setFaqForm(faq);
                            setEditingFAQ(faq);
                            setShowFAQForm(true);
                          }}>
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteFAQ(faq.id)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Policy */}
        <TabsContent value="privacy" className="mt-6">
          <LegalDocEditor
            type="privacy_policy"
            icon={Lock}
            title="Privacy Policy"
            doc={legalDocs.privacy_policy}
            isEditing={editingDoc === "privacy_policy"}
            onEdit={() => startEditDoc("privacy_policy")}
            onCancel={() => setEditingDoc(null)}
            form={docForm}
            setForm={setDocForm}
            onSave={handleSaveDoc}
          />
        </TabsContent>

        {/* Terms & Conditions */}
        <TabsContent value="terms" className="mt-6">
          <LegalDocEditor
            type="terms_conditions"
            icon={FileText}
            title="Terms & Conditions"
            doc={legalDocs.terms_conditions}
            isEditing={editingDoc === "terms_conditions"}
            onEdit={() => startEditDoc("terms_conditions")}
            onCancel={() => setEditingDoc(null)}
            form={docForm}
            setForm={setDocForm}
            onSave={handleSaveDoc}
          />
        </TabsContent>

        {/* Refund Policy */}
        <TabsContent value="refund" className="mt-6">
          <LegalDocEditor
            type="refund_policy"
            icon={FileText}
            title="Refund Policy"
            doc={legalDocs.refund_policy}
            isEditing={editingDoc === "refund_policy"}
            onEdit={() => startEditDoc("refund_policy")}
            onCancel={() => setEditingDoc(null)}
            form={docForm}
            setForm={setDocForm}
            onSave={handleSaveDoc}
          />
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules" className="mt-6">
          <LegalDocEditor
            type="rules"
            icon={Scale}
            title="Tournament Rules"
            doc={legalDocs.rules}
            isEditing={editingDoc === "rules"}
            onEdit={() => startEditDoc("rules")}
            onCancel={() => setEditingDoc(null)}
            form={docForm}
            setForm={setDocForm}
            onSave={handleSaveDoc}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LegalDocEditor({ type, icon: Icon, title, doc, isEditing, onEdit, onCancel, form, setForm, onSave }) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Icon className="w-5 h-5 text-purple-400" />
            {title}
          </CardTitle>
          {!isEditing && (
            <Button onClick={onEdit} className="bg-purple-600 hover:bg-purple-700">
              <Edit className="w-4 h-4 mr-2" />
              {doc ? "Edit" : "Create"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Version</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm({...form, version: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            
            <div>
              <Label className="text-gray-300">Content (HTML/Text supported)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({...form, content: e.target.value})}
                rows={15}
                placeholder="Enter full legal document content here. Supports HTML and line breaks."
                className="bg-gray-900 border-gray-700 text-white font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={onCancel} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={onSave} className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={!form.title || !form.content}>
                <Save className="w-4 h-4 mr-2" />
                Save Document
              </Button>
            </div>
          </div>
        ) : doc ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Version: {doc.version}</p>
              <p className="text-sm text-gray-400 mb-4">Last updated: {new Date(doc.last_updated).toLocaleString()}</p>
              <div className="text-gray-300 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
                {doc.content.substring(0, 500)}...
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No content yet. Click "Create" to add.</p>
        )}
      </CardContent>
    </Card>
  );
}