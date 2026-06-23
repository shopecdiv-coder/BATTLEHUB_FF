import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Clock, Lock } from "lucide-react";

export default function SlotPicker({ selectedSlot, setSelectedSlot, maxSlots, bookedSlots, setError, onBack, onNext }) {
  const taken = bookedSlots || [];
  return (
    <div className="space-y-4">
      <Card className="bg-gray-900/50 border-purple-500/30">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-lg">
            <Clock className="w-5 h-5" /> Choose Your Time Slot
          </div>
          <p className="text-gray-400 text-xs">Select one of the {maxSlots} slots — {taken.length} already booked</p>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: maxSlots }, (_, i) => i + 1).map((slot) => {
              const isTaken = taken.includes(slot);
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isTaken}
                  onClick={() => { if (!isTaken) { setSelectedSlot(slot); setError(""); } }}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    isTaken
                      ? "bg-red-500/10 border-red-500/30 text-red-400/60 cursor-not-allowed line-through"
                      : isSelected
                        ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30 scale-105"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500/50 hover:bg-gray-700"
                  }`}
                >
                  {isTaken ? <Lock className="w-3 h-3 inline mr-1" /> : null}#{slot}
                  {isTaken ? <span className="block text-[9px]">Booked</span> : null}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <Button onClick={onBack} variant="outline" className="flex-1 border-gray-700">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button onClick={onNext} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold">
              Continue <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}