"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FilterDropdownProps {
  filterType: string;
  onApply: (filter: { type: string; value: string; label: string }) => void;
  availableAgents?: string[];
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function FilterDropdown({ filterType, onApply, availableAgents, isOpen, onClose, buttonRef }: FilterDropdownProps) {
  const [inputValue, setInputValue] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const updatePosition = () => {
        if (buttonRef?.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + 6,
            left: rect.left,
          });
        }
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, buttonRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose, buttonRef]);

  const handleApply = () => {
    if (inputValue.trim()) {
      let label = `${filterType}: ${inputValue}`;
      if (filterType === "Date Before" || filterType === "Date After") {
        label = `${filterType} ${inputValue}`;
      } else if (filterType === "Call status") {
        label = `Call status ${inputValue}`;
      }
      
      onApply({
        type: filterType,
        value: inputValue,
        label,
      });
      setInputValue("");
      onClose();
    }
  };

  const renderInput = () => {
    switch (filterType) {
      case "Date Before":
      case "Date After":
        return (
          <input
            type="datetime-local"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
            placeholder="Select date"
          />
        );
      case "Agent":
        return (
          <select
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            <option value="">Select agent</option>
            {availableAgents?.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        );
      case "Call status":
        return (
          <select
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none appearance-none bg-white"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '32px' }}
          >
            <option value="">Select status</option>
            <option value="Successful">Successful</option>
            <option value="Failed">Failed</option>
            <option value="Pending">Pending</option>
          </select>
        );
      case "Duration":
        return (
          <div className="flex gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
              placeholder="Minutes"
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
            placeholder={`Enter ${filterType.toLowerCase()}`}
          />
        );
    }
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && buttonRef?.current && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed backdrop-blur-md bg-white/50 border border-white/40 rounded-xl shadow-lg p-4 z-[100]"
          style={{
            width: '256px',
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          ref={dropdownRef}
        >
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">{filterType}</h4>
            {renderInput()}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onClose();
                setInputValue("");
              }}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 text-sm text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof window !== 'undefined') {
    return createPortal(dropdownContent, document.body);
  }

  return null;
}

