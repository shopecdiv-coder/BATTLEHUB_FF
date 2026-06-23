import React, { useState, useEffect } from "react";
import { DiscountCode } from "@/entities/DiscountCode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Tag, Clock } from "lucide-react";
import { format } from "date-fns";

export default function DiscountCodeManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    discount_percent: 10,
    valid_from: "",
    valid_until: "",
    max_uses: 0,
    min_amount: 0,
    is_active: true
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    const allCodes = await DiscountCode.list("-created_date").catch(() => []);
    setCodes(allCodes);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        code: formData.code.toUpperCase(),
        current_uses: 0
      };

      if (editing) {
        await DiscountCode.update(editing.id, data);
      } else {
        await DiscountCode.create(data);
      }

      await loadCodes();
      resetForm();
      alert("✅ Discount code saved!");
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save code");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this code?")) return;
    try {
      await DiscountCode.delete(id);
      await loadCodes();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_percent: 10,
      valid_from: "",
      valid_until: "",
      max_uses: 0,
      min_amount: 0,
      is_active: true
    });
    setEditing(null);
    setShowForm(false);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-400" />
            Discount Codes ({codes.length})
          </CardTitle>
          <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Code
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form */}
        {showForm && (
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
            <h4 className="font-semibold text-white">{editing ? "Edit Code" : "Create New Code"}</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SAVE20"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Discount % *</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({...formData, discount_percent: parseInt(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Valid From *</Label>
                <Input
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Valid Until *</Label>
                <Input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Max Uses (0 = Unlimited)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({...formData, max_uses: parseInt(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Min Amount Required (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({...formData, min_amount: parseInt(e.target.value) || 0})}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1">Cancel</Button>
              <Button 
                onClick={handleSave} 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={!formData.code || !formData.valid_until || formData.discount_percent < 1}
              >
                {editing ? "Update" : "Create"} Code
              </Button>
            </div>
          </div>
        )}

        {/* Codes List */}
        <div className="space-y-2">
          {codes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No discount codes yet</p>
          ) : (
            codes.map((code) => {
              const now = new Date();
              const isExpired = new Date(code.valid_until) < now;
              const isActive = code.is_active && !isExpired;

              return (
                <div key={code.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xl font-bold text-purple-400">{code.code}</code>
                        <Badge className="bg-green-500/20 text-green-400">
                          {code.discount_percent}% OFF
                        </Badge>
                        {!isActive && (
                          <Badge className="bg-red-500/20 text-red-400">
                            {isExpired ? "Expired" : "Inactive"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>Valid: {format(new Date(code.valid_from || code.created_date), "PPP")} - {format(new Date(code.valid_until), "PPP")}</p>
                        <p>Uses: {code.current_uses}/{code.max_uses || "Unlimited"}</p>
                        {code.min_amount > 0 && <p>Min: ₹{code.min_amount}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setFormData(code);
                          setEditing(code);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(code.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}