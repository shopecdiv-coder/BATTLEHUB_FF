import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hi", name: "हिंदी", flag: "🇮🇳" }
];

export default function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("appLanguage") || "en";
    setCurrentLang(saved);
  }, []);

  const changeLanguage = (code) => {
    setCurrentLang(code);
    localStorage.setItem("appLanguage", code);
    window.location.reload();
  };

  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-gray-300 hover:text-white hover:bg-gray-800 justify-start"
          >
            <Globe className="w-4 h-4 mr-2" />
            <span className="flex-1 text-left">{current.flag} {current.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-gray-900 border-gray-700 w-64">
          <div className="p-3 border-b border-gray-700">
            <p className="text-xs font-semibold text-gray-400 mb-2">🌐 SELECT APP LANGUAGE</p>
            <p className="text-xs text-gray-500">Change app language to your preference. App will refresh automatically.</p>
          </div>
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`p-3 ${
                currentLang === lang.code
                  ? "bg-orange-500/20 text-orange-400 font-bold"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span className="text-xl mr-3">{lang.flag}</span>
              <div className="flex-1">
                <p className="font-medium">{lang.name}</p>
                {currentLang === lang.code && (
                  <p className="text-xs text-orange-400">✓ Currently Active</p>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <div className="p-3 border-t border-gray-700">
            <p className="text-xs text-gray-500">💡 Tip: All menus, buttons, notifications, and content will be translated to your selected language.</p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}