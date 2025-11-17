import { NextRequest, NextResponse } from "next/server";

// Mock settings data - in a real app, this would be stored in a database
let settings = {
  general: {
    siteName: "ReLuit",
    siteUrl: "https://reluit.com",
    adminEmail: "admin@reluit.com",
    defaultTimezone: "UTC",
    defaultLanguage: "en",
  },
  notifications: {
    emailAlerts: true,
    newTenantNotification: true,
    paymentFailureNotification: true,
    weeklyReports: true,
    webhookFailures: true,
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 24,
    passwordMinLength: 8,
    allowRegistration: true,
    requireEmailVerification: true,
  },
  billing: {
    autoCharge: true,
    lateFeeEnabled: false,
    lateFeeAmount: 0,
    dunningAttempts: 3,
    invoiceDaysUntilDue: 30,
  },
};

export async function GET() {
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    settings = body;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
