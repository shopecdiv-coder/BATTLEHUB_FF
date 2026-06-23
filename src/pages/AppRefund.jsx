import React, { useState, useEffect } from "react";
import { LegalContent } from "@/entities/LegalContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppRefund() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const docs = await LegalContent.filter({ content_type: "refund_policy" });
      if (docs.length > 0) {
        setContent(docs[0]);
      }
    } catch (error) {
      console.error("Error loading refund policy:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8">
              <Skeleton className="h-6 w-full bg-gray-800 mb-4" />
              <Skeleton className="h-6 w-3/4 bg-gray-800 mb-4" />
              <Skeleton className="h-6 w-full bg-gray-800" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
              Refund Policy
            </h1>
            <p className="text-gray-400">Understanding our refund terms</p>
          </div>
        </div>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-400" />
              {content?.title || "Refund Policy"}
            </CardTitle>
            {content?.version && (
              <p className="text-sm text-gray-500">Version: {content.version}</p>
            )}
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            {content?.content ? (
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {content.content}
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-500 text-lg">Refund Policy content not available</p>
                <p className="text-gray-600 text-sm mt-2">Please contact support for refund inquiries</p>
              </div>
            )}
          </CardContent>
        </Card>

        {content?.updated_date && (
          <p className="text-sm text-gray-500 text-center">
            Last updated: {new Date(content.updated_date).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
