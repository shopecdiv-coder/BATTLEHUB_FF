import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";

export default function AppPrivacy() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "privacy_policy" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading privacy policy:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
            Privacy Policy
          </h1>
          {content?.version && (
            <p className="text-gray-400 text-sm">Version {content.version}</p>
          )}
        </div>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">{content?.title || "Privacy Policy"}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            {content ? (
              <div 
                className="text-gray-300 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            ) : (
              <p className="text-gray-500 text-center py-8">
                Privacy Policy content not available. Please contact support.
              </p>
            )}
          </CardContent>
        </Card>

        {content?.last_updated && (
          <p className="text-center text-gray-500 text-sm">
            Last updated: {new Date(content.last_updated).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
