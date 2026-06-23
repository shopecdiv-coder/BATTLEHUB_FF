import React, { useState, useEffect } from "react";
import { Tournament } from "@/entities/Tournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkPlus, Copy, Trash2 } from "lucide-react";

export default function TournamentTemplateManager({ onLoadTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const allTemplates = await Tournament.filter({ is_template: true }, "-created_date").catch(() => []);
    setTemplates(allTemplates);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await Tournament.delete(id);
      await loadTemplates();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleUseTemplate = (template) => {
    // Remove template-specific fields
    const { id, created_date, updated_date, created_by, is_template, template_name, current_teams, ...tournamentData } = template;
    onLoadTemplate(tournamentData);
  };

  if (loading) {
    return <div className="text-gray-400 text-center py-4">Loading templates...</div>;
  }

  return (
    <Card className="bg-gray-800 border-gray-700 mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BookmarkPlus className="w-5 h-5 text-cyan-400" />
          Saved Templates ({templates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No templates yet. Save a tournament as template to reuse it later.</p>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">{template.template_name || template.title}</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-purple-500/20 text-purple-400">{template.mode}</Badge>
                    <Badge className="bg-cyan-500/20 text-cyan-400">{template.map}</Badge>
                    <Badge className="bg-green-500/20 text-green-400">₹{template.entry_fee} Fee</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleUseTemplate(template)}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Use
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}