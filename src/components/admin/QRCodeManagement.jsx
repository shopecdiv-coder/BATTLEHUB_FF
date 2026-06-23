import React, { useState, useEffect } from "react";
import { PaymentQR } from "@/entities/PaymentQR";
import { AppSettings } from "@/entities/AppSettings";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Trash2, CheckCircle, HelpCircle } from "lucide-react";

export default function QRCodeManagement({ onUpdate }) {
  const [qrCodes, setQrCodes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ qr_name: "", qr_image_url: "", upi_id: "" });
  const [uploading, setUploading] = useState(false);
  const [utrGuideImage, setUtrGuideImage] = useState("");
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [utrSetting, setUtrSetting] = useState(null);

  useEffect(() => {
    loadQRCodes();
    loadUTRGuide();
  }, []);

  const loadUTRGuide = async () => {
    const settings = await AppSettings.filter({ setting_key: "utr_guide_image" }).catch(() => []);
    if (settings.length > 0) {
      setUtrGuideImage(settings[0].setting_value || "");
      setUtrSetting(settings[0]);
    }
  };

  const handleUploadUTRGuide = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingGuide(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (utrSetting) {
        await AppSettings.update(utrSetting.id, { setting_value: file_url });
      } else {
        await AppSettings.create({
          setting_key: "utr_guide_image",
          setting_value: file_url,
          is_enabled: true,
          description: "UTR number guide image for users"
        });
      }
      setUtrGuideImage(file_url);
      await loadUTRGuide();
      alert("✅ UTR guide image uploaded!");
    } catch { alert("Upload failed"); }
    setUploadingGuide(false);
  };

  const loadQRCodes = async () => {
    const codes = await PaymentQR.list();
    setQrCodes(codes || []);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, qr_image_url: file_url });
    } catch (error) {
      alert("Upload failed");
    }
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!formData.qr_name || !formData.qr_image_url) {
      alert("Please fill all fields");
      return;
    }
    try {
      await PaymentQR.create({ ...formData, is_active: false });
      setFormData({ qr_name: "", qr_image_url: "", upi_id: "" });
      setShowForm(false);
      loadQRCodes();
      onUpdate?.();
    } catch (error) {
      alert("Failed to create QR");
    }
  };

  const setActiveQR = async (id) => {
    try {
      // Deactivate all
      for (const qr of qrCodes) {
        if (qr.is_active) {
          await PaymentQR.update(qr.id, { is_active: false });
        }
      }
      // Activate selected
      await PaymentQR.update(id, { is_active: true });
      loadQRCodes();
      onUpdate?.();
      alert("✅ QR Code activated!");
    } catch (error) {
      alert("Failed to activate");
    }
  };

  const deactivateQR = async (id) => {
    try {
      await PaymentQR.update(id, { is_active: false });
      loadQRCodes();
      onUpdate?.();
      alert("✅ QR Code deactivated!");
    } catch (error) {
      alert("Failed to deactivate");
    }
  };

  const deleteQR = async (id) => {
    if (confirm("Delete this QR code?")) {
      try {
        await PaymentQR.delete(id);
        loadQRCodes();
        onUpdate?.();
      } catch (error) {
        alert("Failed to delete");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* UTR Guide Image Section */}
      <div className="p-4 bg-blue-900/30 border border-blue-500/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-blue-400">UTR Number Guide Image</h3>
        </div>
        <p className="text-gray-400 text-xs">Upload an image showing users where to find their UTR number. This will be shown in the Buy Coins form.</p>
        {utrGuideImage && (
          <div className="space-y-2">
            <p className="text-xs text-green-400">✅ Current guide image:</p>
            <img src={utrGuideImage} alt="UTR Guide" className="max-w-xs rounded-lg border border-gray-700" />
          </div>
        )}
        <label className="cursor-pointer inline-block">
          <div className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 w-fit">
            <Upload className="w-4 h-4" />
            {uploadingGuide ? "Uploading..." : utrGuideImage ? "Update Guide Image" : "Upload Guide Image"}
          </div>
          <input type="file" accept="image/*" onChange={handleUploadUTRGuide} className="hidden" disabled={uploadingGuide} />
        </label>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Payment QR Management</h3>
          <p className="text-sm text-gray-400">Manage up to 5 QR codes, activate one for payments</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} disabled={qrCodes.length >= 5} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add QR ({qrCodes.length}/5)
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-gray-300">QR Name</Label>
              <Input
                value={formData.qr_name}
                onChange={(e) => setFormData({ ...formData, qr_name: e.target.value })}
                placeholder="e.g., Main UPI"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">UPI ID</Label>
              <Input
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                placeholder="yourname@paytm"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Upload QR Image</Label>
              {formData.qr_image_url ? (
                <div className="relative">
                  <img src={formData.qr_image_url} className="w-32 h-32 object-contain bg-white rounded" />
                  <Button size="sm" onClick={() => setFormData({ ...formData, qr_image_url: "" })} className="mt-2">
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-700 rounded p-4 text-center hover:border-green-500/50">
                    {uploading ? "Uploading..." : <><Upload className="w-6 h-6 mx-auto text-gray-500 mb-1" /><p className="text-sm text-gray-400">Upload QR</p></>}
                  </div>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={handleCreate} disabled={uploading} className="flex-1 bg-green-600">Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {qrCodes.map((qr) => (
          <Card key={qr.id} className={`bg-gray-800 ${qr.is_active ? 'border-2 border-green-500' : 'border-gray-700'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-bold text-white">{qr.qr_name}</h4>
                {qr.is_active && (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <img src={qr.qr_image_url} className="w-full h-40 object-contain bg-white rounded mb-3" />
              {qr.upi_id && <p className="text-xs text-gray-400 mb-3">UPI: {qr.upi_id}</p>}
              <div className="flex gap-2">
                {qr.is_active ? (
                  <Button size="sm" onClick={() => deactivateQR(qr.id)} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    Deactivate
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setActiveQR(qr.id)} className="flex-1 bg-green-600">
                    Activate
                  </Button>
                )}
                <Button size="sm" onClick={() => deleteQR(qr.id)} variant="outline" className="border-red-500/50 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}