import { NextResponse } from "next/server";
import { listTenantsWithDomains } from "@/lib/tenants";

export async function GET() {
  try {
    const tenants = await listTenantsWithDomains();
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}
