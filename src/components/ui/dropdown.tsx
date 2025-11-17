"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
  size = "md",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label || placeholder;

  const sizeClasses = {
    sm: "px-2 py-1 pr-6 text-xs",
    md: "px-3 py-1.5 pr-8 text-sm",
    lg: "px-4 py-2 pr-10 text-base",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          appearance-none bg-white border border-gray-200 rounded-[5px] 
          font-medium text-gray-900 hover:bg-gray-50 
          focus:outline-none focus:ring-1 focus:ring-gray-300 
          cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between w-full
          ${sizeClasses[size]}
        `}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`${iconSizes[size]} text-gray-600 transition-transform flex-shrink-0 ml-1 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 backdrop-blur-md bg-white/50 border border-white/40 rounded-xl shadow-lg py-1 z-50 min-w-full"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                disabled={option.disabled}
                className={`
                  w-full text-left px-3 py-1.5 text-sm transition-colors rounded-lg mx-0.5
                  ${
                    value === option.value
                      ? "bg-white/60 text-gray-900 font-medium"
                      : "text-gray-700 hover:bg-white/60"
                  }
                  ${option.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

