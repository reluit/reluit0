"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  setIsOpen?: (open: boolean) => void;
}>({});

function Select({ value, onValueChange, children, disabled }: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, setIsOpen }}>
      <div className="relative">
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<any>, {
                isOpen,
                setIsOpen,
                disabled,
              })
            : child
        )}
      </div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children, isOpen, setIsOpen, disabled }: any) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => !disabled && setIsOpen(!isOpen)}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder}</span>;
}

function SelectContent({ children, isOpen }: SelectContentProps & { isOpen?: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
      {children}
    </div>
  );
}

function SelectItem({ value, children }: SelectItemProps) {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext);

  return (
    <div
      className="relative cursor-pointer select-none px-3 py-2 text-sm hover:bg-gray-100"
      onClick={() => {
        onValueChange?.(value);
        setIsOpen?.(false);
      }}
    >
      {children}
    </div>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
