import React, { useState, useEffect } from "react";
import { FAQ } from "@/entities/FAQ";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Trophy, Gamepad2, Coins, Sword, AlertCircle, ArrowLeft } from "lucide-react";

export default function FAQs() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const allFAQs = await FAQ.filter({ is_active: true }, "order");
      setFaqs(allFAQs || []);
    } catch (error) {
      console.error("Error loading FAQs:", error);
    }
    setLoading(false);
  };

  const categories = [
    { name: "All", icon: HelpCircle, color: "bg-gray-500" },
    { name: "Prizes", icon: Trophy, color: "bg-yellow-500" },
    { name: "Gameplay", icon: Gamepad2, color: "bg-purple-500" },
    { name: "Coins", icon: Coins, color: "bg-green-500" },
    { name: "Matches", icon: Sword, color: "bg-red-500" },
    { name: "Support", icon: AlertCircle, color: "bg-blue-500" }
  ];

  const filteredFAQs = selectedCategory === "All" 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400"></div>
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
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 mb-2">
            ❓ Frequently Asked Questions
          </h1>
          <p className="text-gray-400">Find answers to common questions</p>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              variant={selectedCategory === cat.name ? "default" : "outline"}
              className={`flex items-center gap-2 whitespace-nowrap ${
                selectedCategory === cat.name
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
            </Button>
          ))}
        </div>

        {/* FAQ List */}
        {filteredFAQs.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">No FAQs found for this category</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="space-y-3">
                {filteredFAQs.map((faq, index) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={`item-${index}`}
                    className="bg-gray-800/50 rounded-lg border border-gray-700 px-4"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{faq.question}</p>
                          <Badge className="mt-2 bg-orange-500/20 text-orange-400 text-xs">
                            {faq.category}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-300 pt-2 pb-4 whitespace-pre-wrap">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}