'use client';

import { useState, useEffect } from 'react';

interface TenantData {
  id: string;
  slug: string;
  name: string;
  branding: any;
  metadata: any;
}

export function useTenant() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        // Get slug from path or data attributes
        let slug = '';

        // Try to get from data attribute first
        const tenantElement = document.querySelector('[data-tenant-slug]');
        if (tenantElement) {
          slug = tenantElement.getAttribute('data-tenant-slug') || '';
        } else {
          // Extract from path
          const path = window.location.pathname;
          const match = path.match(/^\/([^/]+)/);
          if (match) {
            slug = match[1];
          }
        }

        if (!slug) {
          throw new Error('Tenant slug not found');
        }

        const response = await fetch(`/api/tenant?slug=${slug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch tenant');
        }

        const data = await response.json();
        setTenant(data.tenant);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return { tenant, loading, error };
}
