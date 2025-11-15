"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Receipt } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  const [selectedMonth, setSelectedMonth] = useState("October 2025");

  const months = [
    "October 2025",
    "September 2025",
    "August 2025",
    "July 2025",
  ];

  useEffect(() => {
    // Scroll to top on mount for smooth transition
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="page-transition-wrapper">
      <div
        className="page-content"
        style={{
          paddingLeft: '0px',
          paddingTop: '0px',
        }}
      >
        <div className="relative" style={{ paddingLeft: '72px', paddingRight: '48px' }}>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-[1.625rem] font-medium text-gray-900">
              Billing
            </h1>
          </div>

          <div className="space-y-4">
            {/* Invoices Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-gray-900">Invoices</h2>
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-[5px] px-3 py-1 pr-8 text-xs font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300 cursor-pointer transition-all"
                    style={{
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath fill=\'%236b7280\' d=\'M5 7L1 3h8z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 6px center',
                      paddingRight: '24px'
                    }}
                  >
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <Link
                    href="#"
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors"
                  >
                    Manage subscription
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Invoices Table */}
              <div className="bg-white rounded-lg overflow-hidden" style={{ width: '100%' }}>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 border-b border-gray-200">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                          Invoice
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 border-b border-gray-200 whitespace-nowrap">
                          Oct 27, 2025
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-b border-gray-200 whitespace-nowrap">
                          -
                        </td>
                        <td className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-xs font-medium bg-emerald-100 text-emerald-800">
                            Paid
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right border-b border-gray-200 whitespace-nowrap">
                          $0.00 USD
                        </td>
                        <td className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                          <Link
                            href="#"
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-900 hover:text-gray-700 transition-colors"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="pb-8"></div>
        </div>
      </div>
    </div>
  );
}

