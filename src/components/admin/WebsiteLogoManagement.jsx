import React, { useState, useEffect } from "react";
import { AppSettings } from "@/entities/AppSettings";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, X, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function WebsiteLogoManagement() {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeLogo, setActiveLogo] = useState(null);

  const loadData = () => {
    AppSettings.filter({ setting_key: "website_logo" }).then(res => {
      if (res.length > 0) {
        setActiveLogo(res[0]);
      } else {
        setActiveLogo(null);
      }
    }).catch(()=>{});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file");
      return;
    }

    setUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setLogoUrl(file_url);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert(`Failed to upload logo: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveLogo = async () => {
    if (!logoUrl) {
      alert("Please upload an image first");
      return;
    }

    setSavingSettings(true);
    try {
      const settingData = {
        setting_key: "website_logo",
        setting_value: logoUrl,
      };

      if (activeLogo) {
        await AppSettings.update(activeLogo.id, settingData);
      } else {
        await AppSettings.create(settingData);
      }

      setLogoUrl("");
      loadData();
      alert("Website Logo saved successfully!");
    } catch (error) {
      console.error("Error saving website logo:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const deleteLogo = async () => {
    if (confirm("Delete the Website Logo? The website will revert to its default logo.")) {
      try {
        if (activeLogo) {
          await AppSettings.delete(activeLogo.id);
          loadData();
          alert("Website Logo deleted successfully!");
        }
      } catch (error) {
        console.error("Error deleting logo:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Website Logo Management</h2>
          <p className="text-gray-400 text-sm">Upload a custom logo that will appear on the SaaS landing page.</p>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg text-gray-200">Upload New Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {logoUrl ? (
              <div className="relative group max-w-sm mx-auto">
                <div className="bg-[#050811] p-6 rounded-lg border-2 border-orange-500/50 flex justify-center">
                  <img
                    src={logoUrl}
                    alt="Uploaded Logo Preview"
                    className="h-16 object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer max-w-md mx-auto block">
                <div className="border-2 border-dashed border-gray-700 hover:border-orange-500/50 rounded-lg p-8 text-center transition-colors">
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                      <p className="text-sm text-gray-400">Uploading logo...</p>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                      <p className="text-sm text-gray-400 mb-1">Click to upload Website Logo</p>
                      <p className="text-xs text-gray-500">PNG, SVG, or JPG transparent background recommended</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </label>
            )}
          </div>

          <Button
            onClick={handleSaveLogo}
            disabled={!logoUrl || uploadingLogo || savingSettings}
            className="w-full max-w-md mx-auto block bg-orange-600 hover:bg-orange-500 text-white"
          >
            <Upload className="w-4 h-4 inline-block mr-2" />
            Set as Website Logo
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-100">Current Website Logo</h3>
        {!activeLogo ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Custom Logo Set</h3>
            <p className="text-gray-500">The website is currently using the default logo.</p>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="bg-[#050811] p-4 rounded-lg flex-1 flex justify-center border border-gray-800">
                    <img
                      src={activeLogo.setting_value}
                      alt="Active Website Logo"
                      className="h-16 object-contain"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="outline"
                      onClick={deleteLogo}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Logo
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  This logo is currently live on your SaaS website.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
