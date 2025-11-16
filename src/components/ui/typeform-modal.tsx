"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TypeformModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TypeformModal({ isOpen, onClose }: TypeformModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load Typeform script when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset submitted state when opening
      setIsSubmitted(false);

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="embed.typeform.com"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "//embed.typeform.com/next/embed.js";
        script.async = true;
        document.body.appendChild(script);

        // Listen for Typeform submission
        const handleTypeformSubmit = () => {
          setIsSubmitted(true);
          // Auto-close after 3 seconds
          setTimeout(() => {
            onClose();
          }, 3000);
        };

        // Wait for Typeform to be available
        script.onload = () => {
          // Listen for form submission
          window.addEventListener("message", (event) => {
            if (event.data?.type === "form-submit") {
              handleTypeformSubmit();
            }
          });
        };

        return () => {
          document.body.removeChild(script);
        };
      } else {
        // Script already exists, just listen for submission
        window.addEventListener("message", (event) => {
          if (event.data?.type === "form-submit") {
            setIsSubmitted(true);
            setTimeout(() => {
              onClose();
            }, 3000);
          }
        });
      }
    }
  }, [isOpen, onClose]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitted(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-6xl h-[700px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white/50 backdrop-blur-md shadow-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-900">Request Edit</h2>
              <button
                onClick={onClose}
                disabled={isSubmitted}
                className={`rounded-sm transition-opacity focus:outline-none ${
                  isSubmitted ? 'opacity-30 cursor-not-allowed' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Typeform Container or Thank You Message */}
            {isSubmitted ? (
              <div className="w-full h-[calc(700px-60px)] flex flex-col items-center justify-center text-center p-8">
                <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Thank you!</h3>
                <p className="text-gray-600 max-w-md">
                  We'll get back to you immediately with those changes.
                </p>
              </div>
            ) : (
              <div className="w-full h-[calc(700px-60px)] pt-4">
                <div
                  data-tf-live="01KA4MYGNGSGYQT7P4FT33Q616"
                  className="w-full h-full"
                  style={{
                    width: '800px',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
