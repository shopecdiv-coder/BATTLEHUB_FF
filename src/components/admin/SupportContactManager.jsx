import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Plus, Trash2, Save, Edit2, X, Check } from "lucide-react";

export default function SupportContactManager() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", whatsapp_number: "", role: "", order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { SupportContact } = await import("@/entities/SupportContact");
      const all = await SupportContact.list("order", 20).catch(() => []);
      setContacts(all || []);
    } catch { setContacts([]); }
    setLoading(false);
  };

  const save = async () => {
    if (!form.name.trim() || !form.whatsapp_number.trim()) return;
    setSaving(true);
    const { SupportContact } = await import("@/entities/SupportContact");
    if (editId) {
      await SupportContact.update(editId, { ...form, is_active: true }).catch(() => {});
    } else {
      await SupportContact.create({ ...form, is_active: true }).catch(() => {});
    }
    setForm({ name: "", whatsapp_number: "", role: "", order: 0 });
    setShowAdd(false);
    setEditId(null);
    setSaving(false);
    loadContacts();
  };

  const remove = async (id) => {
    if (!confirm("Remove this support contact?")) return;
    const { SupportContact } = await import("@/entities/SupportContact");
    await SupportContact.delete(id).catch(() => {});
    loadContacts();
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, whatsapp_number: c.whatsapp_number, role: c.role || "", order: c.order || 0 });
    setShowAdd(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-bold text-white">WhatsApp Support Contacts</h2>
        </div>
        <Button onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: "", whatsapp_number: "", role: "", order: contacts.length }); }} className="bg-green-600 hover:bg-green-700" size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Contact
        </Button>
      </div>

      {showAdd && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
          <p className="text-white font-semibold text-sm">{editId ? "Edit Contact" : "New Support Contact"}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rahul (Support)" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">WhatsApp Number * (with country code)</Label>
              <Input value={form.whatsapp_number} onChange={e => setForm(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="e.g. 917366877171" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Role / Specialty</Label>
              <Input value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Payment Support" className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Display Order</Label>
              <Input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="bg-gray-800 border-gray-700 text-white mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !form.name.trim() || !form.whatsapp_number.trim()} className="bg-green-600 hover:bg-green-700" size="sm">
              <Check className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={() => { setShowAdd(false); setEditId(null); }} variant="outline" size="sm" className="border-gray-700 text-gray-400">
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No support contacts added yet. Click "Add Contact" to add one.</div>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{c.name}</p>
                  <p className="text-green-400 text-xs font-mono">+{c.whatsapp_number}</p>
                  {c.role && <Badge className="bg-gray-800 text-gray-400 border-gray-700 text-[10px] mt-0.5">{c.role}</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/${c.whatsapp_number}?text=${encodeURIComponent('Hello, I need help with BattleHub FF')}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-xs">Test</Button>
                </a>
                <Button onClick={() => startEdit(c)} size="sm" variant="outline" className="border-gray-700 text-gray-400 h-8">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={() => remove(c.id)} size="sm" variant="outline" className="border-red-800 text-red-400 h-8">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-900/50 rounded-lg p-3">
        💡 These contacts will appear on the Support page for users to choose. Enter numbers with country code (no +), e.g. <span className="text-gray-400 font-mono">917366877171</span> for India.
      </div>
    </div>
  );
}