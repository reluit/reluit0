"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles, BarChart3, Settings, Zap } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Dashboard!",
    description: "Get started by exploring your analytics, managing your voice agent, and connecting integrations. Everything you need is just a click away.",
    icon: <Sparkles className="w-8 h-8" />,
  },
  {
    id: "analytics",
    title: "Track Your Performance",
    description: "Monitor call analytics, view sentiment analysis, and track booking activity. Use the date picker to filter by time period and customize your dashboard widgets.",
    icon: <BarChart3 className="w-8 h-8" />,
  },
  {
    id: "integrations",
    title: "Connect Your Tools",
    description: "Integrate with Calendly, HubSpot, Pipedrive, Salesforce, and more. Sync your tools to enable your voice agent to book appointments and manage your CRM.",
    icon: <Zap className="w-8 h-8" />,
  },
  {
    id: "settings",
    title: "Customize Your Experience",
    description: "Configure your voice agent, manage team members, and customize your dashboard. Everything is tailored to your business needs.",
    icon: <Settings className="w-8 h-8" />,
  },
];

interface OnboardingCarouselProps {
  onComplete: () => void;
}

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Check if user has already completed onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("onboarding_completed");
    if (hasSeenOnboarding === "true") {
      setIsVisible(false);
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("onboarding_completed", "true");
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleSkip();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-100">
            <motion.div
              className="h-full bg-gray-900"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentStep
                      ? "bg-gray-900 w-8"
                      : index < currentStep
                      ? "bg-gray-400"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Icon */}
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
                    {step.icon}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {currentStep === onboardingSteps.length - 1 ? "Get Started" : "Next"}
                  <ChevronRight className="w-4 h-4 inline-block ml-2" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

