import React, { useState, useEffect } from "react";
import { AppSettings } from "@/entities/AppSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Moon, Sun } from "lucide-react";

export default function ThemeManager() {
  const [currentTheme, setCurrentTheme] = useState("dark");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const settings = await AppSettings.filter({ setting_key: "app_theme" });
    if (settings.length > 0) {
      setCurrentTheme(settings[0].setting_value || "dark");
    }
    setLoading(false);
  };

  const changeTheme = async (theme) => {
    setLoading(true);
    
    const settings = await AppSettings.filter({ setting_key: "app_theme" });
    
    if (settings.length > 0) {
      await AppSettings.update(settings[0].id, { 
        setting_value: theme,
        is_enabled: true 
      });
    } else {
      await AppSettings.create({
        setting_key: "app_theme",
        setting_value: theme,
        is_enabled: true
      });
    }
    
    setCurrentTheme(theme);
    alert(`✅ Theme changed to ${theme}. Users will see the new theme on page refresh.`);
    setLoading(false);
  };

  const themes = [
    { 
      name: "Dark", 
      value: "dark", 
      icon: Moon,
      gradient: "from-black via-blue-950 to-black",
      description: "Default dark blue theme"
    },
    { 
      name: "Pure Black", 
      value: "black", 
      icon: Moon,
      gradient: "from-black via-gray-900 to-black",
      description: "Pure black theme"
    },
    { 
      name: "Light", 
      value: "light", 
      icon: Sun,
      gradient: "from-white via-gray-50 to-white",
      description: "Clean light theme"
    }
  ];

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-400" />
          App Theme Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-sm">
            ℹ️ Current theme: <Badge className="ml-2 bg-blue-500/20 text-blue-400">{currentTheme}</Badge>
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Supported themes: Dark (Blue-Black), Pure Black, Light
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.value}
              className={`p-4 rounded-lg border-2 ${
                currentTheme === theme.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <theme.icon className={`w-5 h-5 ${
                    currentTheme === theme.value ? 'text-purple-400' : 'text-gray-400'
                  }`} />
                  <span className="font-semibold text-white">{theme.name}</span>
                </div>
                {currentTheme === theme.value && (
                  <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                )}
              </div>
              
              <div className={`h-16 rounded-lg bg-gradient-to-br ${theme.gradient} mb-3`}></div>
              
              <p className="text-xs text-gray-400 mb-3">{theme.description}</p>
              
              <Button
                onClick={() => changeTheme(theme.value)}
                disabled={loading || currentTheme === theme.value}
                className={`w-full ${
                  currentTheme === theme.value
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90'
                }`}
              >
                {currentTheme === theme.value ? 'Current Theme' : 'Apply Theme'}
              </Button>
            </div>
          ))}
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm font-semibold mb-2">⚠️ How it works:</p>
          <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
            <li>Theme changes apply globally to all users</li>
            <li>Users need to refresh the page to see changes</li>
            <li>Dark theme (default): Black background with blue accents</li>
            <li>Pure Black: Complete black background</li>
            <li>Light theme: Clean white background (experimental)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}