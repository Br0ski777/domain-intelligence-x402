import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "domain-intelligence",
  slug: "domain-intelligence",
  description: "WHOIS + DNS + SSL certificate intelligence for any domain in one API call.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/lookup",
      price: "$0.005",
      description: "Get comprehensive domain intelligence (WHOIS + DNS + SSL)",
      toolName: "domain_lookup_intelligence",
      toolDescription: "Use this when you need comprehensive domain information. Returns: WHOIS data (registrar, creation date, expiry, nameservers), DNS records (A, AAAA, MX, TXT, NS, CNAME), SSL certificate details (issuer, valid from/to, days remaining), domain age in days. Do NOT use for website content — use web_scrape_to_markdown instead.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain to lookup (e.g. example.com)" },
        },
        required: ["domain"],
      },
    },
  ],
};
