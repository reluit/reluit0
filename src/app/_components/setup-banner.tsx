"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, CreditCard } from "lucide-react";

interface SetupBannerProps {
  slug: string;
  setupComplete: boolean;
}

export function SetupBanner({ slug, setupComplete }: SetupBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();

  // Show on all pages - no exclusion for billing page
  // Don't show if setup is complete
  if (setupComplete || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-3 h-3 text-blue-600" />
          </div>
          <p className="text-xs text-blue-700">
            Complete your setup to access all features.{' '}
            <Link
              href={`/${slug}/dashboard/billing`}
              className="font-medium text-blue-700 hover:text-blue-900 underline transition-colors"
            >
              Complete payment
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
