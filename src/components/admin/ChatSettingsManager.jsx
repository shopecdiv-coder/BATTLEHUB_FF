import React, { useState, useEffect } from "react";
import { ChatSettings } from "@/entities/ChatSettings";
import { PhotoLibrary } from "@/entities/PhotoLibrary";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Upload, Image } from "lucide-react";

export default function ChatSettingsManager() {
  const [settings, setSettings] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPhotoSelect, setShowPhotoSelect] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allSettings = await ChatSettings.list();
    if (allSettings.length > 0) {
      setSettings(allSettings[0]);
    } else {
      const newSettings = await ChatSettings.create({ 
        background_url: "", 
        chat_dp_url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png"
      });
      setSettings(newSettings);
    }

    const allPhotos = await PhotoLibrary.list("-created_date", 50);
    setPhotos(allPhotos || []);
  };

  const uploadImage = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await UploadFile({ file });
    await ChatSettings.update(settings.id, { [field]: file_url });
    await loadData();
    setUploading(false);
    alert("✅ Updated!");
  };

  const selectFromLibrary = async (photoUrl, field) => {
    await ChatSettings.update(settings.id, { [field]: photoUrl });
    await loadData();
    setShowPhotoSelect(null);
    alert("✅ Selected from library!");
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Chat Settings (All Users)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-gray-300">Chat Background Image</Label>
          <div className="flex gap-3">
            <label className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e, "background_url")}
                className="hidden"
                id="bg-upload"
                disabled={uploading}
              />
              <Button
                onClick={() => document.getElementById("bg-upload").click()}
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload New"}
              </Button>
            </label>
            <Button
              onClick={() => setShowPhotoSelect("background")}
              variant="outline"
              className="border-gray-600"
            >
              <Image className="w-4 h-4 mr-2" />
              From Library
            </Button>
          </div>
          {settings?.background_url && (
            <img src={settings.background_url} alt="BG" className="w-32 h-32 object-cover rounded-lg" />
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-gray-300">Chat Profile Picture (DP)</Label>
          <div className="flex gap-3">
            <label className="flex-1">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e, "chat_dp_url")}
                className="hidden"
                id="dp-upload"
                disabled={uploading}
              />
              <Button
                onClick={() => document.getElementById("dp-upload").click()}
                disabled={uploading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload New"}
              </Button>
            </label>
            <Button
              onClick={() => setShowPhotoSelect("dp")}
              variant="outline"
              className="border-gray-600"
            >
              <Image className="w-4 h-4 mr-2" />
              From Library
            </Button>
          </div>
          {settings?.chat_dp_url && (
            <img src={settings.chat_dp_url} alt="DP" className="w-20 h-20 rounded-full object-cover" />
          )}
        </div>

        {showPhotoSelect && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
              <h3 className="text-xl font-bold text-white mb-4">Select from Photo Library</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => selectFromLibrary(photo.photo_url, showPhotoSelect === "background" ? "background_url" : "chat_dp_url")}
                    className="cursor-pointer hover:opacity-75 transition"
                  >
                    <img src={photo.photo_url} alt={photo.title} className="w-full h-32 object-cover rounded-lg" />
                  </div>
                ))}
              </div>
              <Button onClick={() => setShowPhotoSelect(null)} className="mt-4 w-full" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}