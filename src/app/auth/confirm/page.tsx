import { Suspense } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function ConfirmContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-8 w-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">You&apos;re all set!</h1>
          <p className="text-sm text-gray-600">
            Your email has been confirmed. You can now access your dashboard.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="https://reluit.com"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            Go to Reluit
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}

