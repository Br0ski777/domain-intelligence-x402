# Domain Intelligence API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://domain-intelligence.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Domain intelligence in one call: WHOIS, DNS records, SSL certificate, domain age. Essential for due diligence and security audits. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "domain-intelligence": {
      "url": "https://domain-intelligence.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://domain-intelligence.api.klymax402.com/api/lookup?domain=..."
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `domain_lookup_intelligence` | GET | `/api/lookup` | $0.012 | Get comprehensive domain intelligence (WHOIS + DNS + SSL) |
| `domain_lookup_intelligence` | POST | `/api/lookup` | $0.012 | Get comprehensive domain intelligence (WHOIS + DNS + SSL) (POST variant) |

### `domain_lookup_intelligence`

Use this when you need comprehensive domain intelligence -- WHOIS, DNS, and SSL data in a single call. Returns structured JSON with full domain profile.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `domain` | string | yes | Domain to lookup (e.g. example.com) |

Example response:

```json
{"whois":{"registrar":"Cloudflare","createdDate":"2010-01-15","expiryDate":"2027-01-15","nameservers":["ns1.cloudflare.com"]},"dns":{"a":["104.26.10.1"],"mx":[{"priority":10,"exchange":"mx.example.com"}]},"ssl":{"issuer":"Let's Encrypt","daysRemaining":45},"domainAge":5932}
```

**When to use**: domain purchases, security audits, phishing investigations, or due diligence on vendors. Essential for checking domain legitimacy, SSL health, and DNS configuration.

**Not for**: company data (use `company_enrich_from_domain`), IP geolocation (use `ip_lookup_geolocation`), website content (use `web_scrape_to_markdown`), email deliverability (use `email_audit_deliverability`).

### `domain_lookup_intelligence`

Use this when you need comprehensive domain intelligence -- WHOIS, DNS, and SSL data in a single call. Returns structured JSON with full domain profile. POST variant of domain_lookup_intelligence -- same params passed as JSON body instead of query string.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `domain` | string | yes | Domain to lookup (e.g. example.com) |

Example response:

```json
{"whois":{"registrar":"Cloudflare","createdDate":"2010-01-15","expiryDate":"2027-01-15","nameservers":["ns1.cloudflare.com"]},"dns":{"a":["104.26.10.1"],"mx":[{"priority":10,"exchange":"mx.example.com"}]},"ssl":{"issuer":"Let's Encrypt","daysRemaining":45},"domainAge":5932}
```

**When to use**: domain purchases, security audits, phishing investigations, or due diligence on vendors. Essential for checking domain legitimacy, SSL health, and DNS configuration.

**Not for**: company data (use `company_enrich_from_domain`), IP geolocation (use `ip_lookup_geolocation`), website content (use `web_scrape_to_markdown`), email deliverability (use `email_audit_deliverability`).

## Example agent prompts

- "Comprehensive domain intelligence -- WHOIS, DNS, and SSL data in a single call"
- "Comprehensive domain intelligence -- WHOIS, DNS, and SSL data in a single call"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
