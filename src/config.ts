import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "domain-intelligence",
  slug: "domain-intelligence",
  description: "Domain intelligence in one call: WHOIS, DNS records, SSL certificate, domain age. Essential for due diligence and security audits.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/lookup",
      price: "$0.005",
      description: "Get comprehensive domain intelligence (WHOIS + DNS + SSL)",
      toolName: "domain_lookup_intelligence",
      toolDescription: `Use this when you need comprehensive domain intelligence -- WHOIS, DNS, and SSL data in a single call. Returns structured JSON with full domain profile.

1. whois.registrar (string) -- domain registrar name
2. whois.createdDate (string) -- domain registration date
3. whois.expiryDate (string) -- domain expiration date
4. whois.nameservers (array) -- authoritative nameservers
5. dns.a (array) -- A records (IPv4 addresses)
6. dns.aaaa (array) -- AAAA records (IPv6 addresses)
7. dns.mx (array) -- mail exchange records with priority
8. dns.txt (array) -- TXT records (SPF, verification, etc.)
9. dns.ns (array) -- NS records
10. dns.cname (array) -- CNAME aliases
11. ssl.issuer (string) -- certificate authority (Let's Encrypt, DigiCert, etc.)
12. ssl.validFrom (string) -- certificate start date
13. ssl.validTo (string) -- certificate expiry date
14. ssl.daysRemaining (number) -- days until SSL expiry
15. domainAge (number) -- domain age in days

Example output: {"whois":{"registrar":"Cloudflare","createdDate":"2010-01-15","expiryDate":"2027-01-15","nameservers":["ns1.cloudflare.com"]},"dns":{"a":["104.26.10.1"],"mx":[{"priority":10,"exchange":"mx.example.com"}]},"ssl":{"issuer":"Let's Encrypt","daysRemaining":45},"domainAge":5932}

Use this BEFORE domain purchases, security audits, phishing investigations, or due diligence on vendors. Essential for checking domain legitimacy, SSL health, and DNS configuration.

Do NOT use for company data -- use company_enrich_from_domain instead. Do NOT use for IP geolocation -- use ip_lookup_geolocation instead. Do NOT use for website content -- use web_scrape_to_markdown instead. Do NOT use for email deliverability -- use email_audit_deliverability instead.`,
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
