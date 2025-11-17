import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface ResendEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  last_event: string;
  html?: string;
  text?: string;
}

/**
 * Fetch all emails from Resend with pagination
 */
export async function fetchAllEmails(): Promise<ResendEmail[]> {
  const resend = getResendClient();
  let allEmails: ResendEmail[] = [];
  let hasMore = true;
  let after: string | null = null;

  try {
    while (hasMore) {
      const response = await resend.emails.list({
        limit: 100,
        ...(after && { after }),
      });

      if (response.data && response.data.data) {
        allEmails = allEmails.concat(response.data.data as ResendEmail[]);
        hasMore = response.data.has_more || false;
        after = response.data.data[response.data.data.length - 1]?.id || null;
      } else {
        hasMore = false;
      }
    }

    return allEmails;
  } catch (error) {
    console.error("Error fetching emails from Resend:", error);
    throw error;
  }
}

/**
 * Fetch emails from Resend that match a subject filter
 */
export async function fetchEmailsBySubject(
  subjectFilter: string,
  limit: number = 100
): Promise<ResendEmail[]> {
  try {
    const allEmails = await fetchAllEmails();
    const filtered = allEmails.filter((email) =>
      email.subject?.toLowerCase().includes(subjectFilter.toLowerCase())
    );
    return filtered.slice(0, limit);
  } catch (error) {
    console.error("Error fetching emails by subject:", error);
    throw error;
  }
}

/**
 * Get email details by ID from Resend
 */
export async function getEmailById(emailId: string): Promise<any> {
  const resend = getResendClient();
  
  try {
    const response = await resend.emails.get(emailId);
    return response.data;
  } catch (error) {
    console.error("Error fetching email from Resend:", error);
    throw error;
  }
}
