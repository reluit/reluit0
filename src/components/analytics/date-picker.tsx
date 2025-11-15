"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type DateRangeOption = 
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "last3Months";

interface DatePickerProps {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
}

const dateOptions: { value: DateRangeOption; label: string }[] = [
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "last3Months", label: "Last 3 Months" },
];

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = dateOptions.find((opt) => opt.value === value)?.label || "Select";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 transition-colors border border-gray-200 rounded-full bg-white"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 backdrop-blur-md bg-white/50 border border-white/40 rounded-xl shadow-lg py-1 z-50 min-w-fit">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1 text-sm transition-colors rounded-lg mx-0.5 ${
                value === option.value
                  ? "bg-white/60 text-gray-900 font-medium"
                  : "text-gray-700 hover:bg-white/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

