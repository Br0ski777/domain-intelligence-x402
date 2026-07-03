import type { Hono } from "hono";
import { promises as dns } from "dns";
import * as tls from "tls";


// ATXP: requirePayment only fires inside an ATXP context (set by atxpHono middleware).
// For raw x402 requests, the existing @x402/hono middleware handles the gate.
// If neither protocol is active (ATXP_CONNECTION unset), tryRequirePayment is a no-op.
async function tryRequirePayment(price: number): Promise<void> {
  if (!process.env.ATXP_CONNECTION) return;
  try {
    const { requirePayment } = await import("@atxp/server");
    const BigNumber = (await import("bignumber.js")).default;
    await requirePayment({ price: BigNumber(price) });
  } catch (e: any) {
    if (e?.code === -30402) throw e;
  }
}

// ---------------------------------------------------------------------------
// DNS lookups via Node.js dns/promises
// ---------------------------------------------------------------------------

interface DnsRecords {
  A: string[];
  AAAA: string[];
  MX: { priority: number; exchange: string }[];
  TXT: string[];
  NS: string[];
  CNAME: string[];
}

async function resolveDns(domain: string): Promise<DnsRecords> {
  const results: DnsRecords = { A: [], AAAA: [], MX: [], TXT: [], NS: [], CNAME: [] };

  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  results.A = await safe(() => dns.resolve4(domain), []);
  results.AAAA = await safe(() => dns.resolve6(domain), []);
  results.MX = await safe(async () => {
    const mx = await dns.resolveMx(domain);
    return mx.map(m => ({ priority: m.priority, exchange: m.exchange }));
  }, []);
  results.TXT = await safe(async () => {
    const txt = await dns.resolveTxt(domain);
    return txt.map(t => t.join(""));
  }, []);
  results.NS = await safe(() => dns.resolveNs(domain), []);
  results.CNAME = await safe(() => dns.resolveCname(domain), []);

  return results;
}

// ---------------------------------------------------------------------------
// WHOIS via free HTTP API (whoisjson or rdap)
// ---------------------------------------------------------------------------

interface WhoisData {
  registrar: string | null;
  creation_date: string | null;
  expiry_date: string | null;
  updated_date: string | null;
  nameservers: string[];
  status: string[];
  domain_age_days: number | null;
}

async function lookupWhois(domain: string): Promise<WhoisData> {
  const result: WhoisData = {
    registrar: null, creation_date: null, expiry_date: null,
    updated_date: null, nameservers: [], status: [], domain_age_days: null,
  };

  try {
    // Try RDAP (Registration Data Access Protocol) — free, no API key
    const tld = domain.split(".").pop()!;
    const bootstrapRes = await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(5000) });
    const bootstrap = await bootstrapRes.json() as { services: [string[], string[]][] };

    let rdapBase: string | null = null;
    for (const [tlds, urls] of bootstrap.services) {
      if (tlds.includes(tld)) { rdapBase = urls[0]; break; }
    }

    if (rdapBase) {
      const rdapUrl = `${rdapBase.replace(/\/$/, "")}/domain/${domain}`;
      const rdapRes = await fetch(rdapUrl, { signal: AbortSignal.timeout(8000) });
      if (rdapRes.ok) {
        const data = await rdapRes.json() as any;

        // Extract registrar from entities
        if (data.entities) {
          for (const entity of data.entities) {
            if (entity.roles?.includes("registrar")) {
              result.registrar = entity.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3]
                || entity.publicIds?.[0]?.identifier
                || null;
            }
          }
        }

        // Extract dates from events
        if (data.events) {
          for (const ev of data.events) {
            if (ev.eventAction === "registration") result.creation_date = ev.eventDate;
            if (ev.eventAction === "expiration") result.expiry_date = ev.eventDate;
            if (ev.eventAction === "last changed") result.updated_date = ev.eventDate;
          }
        }

        // Nameservers
        if (data.nameservers) {
          result.nameservers = data.nameservers.map((ns: any) => ns.ldhName).filter(Boolean);
        }

        // Status
        if (data.status) {
          result.status = data.status;
        }

        // Domain age
        if (result.creation_date) {
          const created = new Date(result.creation_date);
          if (!isNaN(created.getTime())) {
            result.domain_age_days = Math.floor((Date.now() - created.getTime()) / 86400000);
          }
        }
      }
    }
  } catch {
    // WHOIS lookup failed — return partial data
  }

  return result;
}

// ---------------------------------------------------------------------------
// SSL certificate info via TLS socket
// ---------------------------------------------------------------------------

interface SslInfo {
  issuer: string | null;
  subject: string | null;
  valid_from: string | null;
  valid_to: string | null;
  days_remaining: number | null;
  serial_number: string | null;
  fingerprint: string | null;
  protocol: string | null;
}

async function lookupSsl(domain: string): Promise<SslInfo> {
  const result: SslInfo = {
    issuer: null, subject: null, valid_from: null, valid_to: null,
    days_remaining: null, serial_number: null, fingerprint: null, protocol: null,
  };

  return new Promise((resolve) => {
    const timeout = setTimeout(() => { socket.destroy(); resolve(result); }, 8000);

    const socket = tls.connect(443, domain, { servername: domain, rejectUnauthorized: false }, () => {
      clearTimeout(timeout);
      try {
        const cert = socket.getPeerCertificate();
        if (cert && cert.subject) {
          result.issuer = typeof cert.issuer === "object"
            ? (cert.issuer as any).O || (cert.issuer as any).CN || JSON.stringify(cert.issuer)
            : String(cert.issuer);
          result.subject = typeof cert.subject === "object"
            ? (cert.subject as any).CN || JSON.stringify(cert.subject)
            : String(cert.subject);
          result.valid_from = cert.valid_from || null;
          result.valid_to = cert.valid_to || null;
          result.serial_number = cert.serialNumber || null;
          result.fingerprint = cert.fingerprint256 || cert.fingerprint || null;
          result.protocol = socket.getProtocol() || null;

          if (cert.valid_to) {
            const expiry = new Date(cert.valid_to);
            if (!isNaN(expiry.getTime())) {
              result.days_remaining = Math.floor((expiry.getTime() - Date.now()) / 86400000);
            }
          }
        }
      } catch { /* cert parse error */ }
      socket.end();
      resolve(result);
    });

    socket.on("error", () => { clearTimeout(timeout); resolve(result); });
  });
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerRoutes(app: Hono) {
  async function handleLookup(c: any, params: { domain?: string }) {
    await tryRequirePayment(0.005);
    const domain = params.domain;
    if (!domain) return c.json({ error: "Missing required parameter: domain" }, 400);

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    if (!domainRegex.test(cleanDomain)) {
      return c.json({ error: "Invalid domain format. Example: example.com" }, 400);
    }

    const startTime = Date.now();

    try {
      // Run all lookups in parallel
      const [dnsRecords, whois, ssl] = await Promise.all([
        resolveDns(cleanDomain),
        lookupWhois(cleanDomain),
        lookupSsl(cleanDomain),
      ]);

      return c.json({
        domain: cleanDomain,
        whois,
        dns: dnsRecords,
        ssl,
        lookup_time_ms: Date.now() - startTime,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      return c.json({ error: msg, domain: cleanDomain, lookup_time_ms: Date.now() - startTime }, 500);
    }
  }

  app.get("/api/lookup", async (c) => {
    return handleLookup(c, { domain: c.req.query("domain") });
  });

  // POST mirror of the GET route above -- Bazaar (CDP) only reliably indexes
  // POST payments with valid payloads (~82% conversion vs ~14% for GET-only
  // resources, confirmed empirically). Same params, same logic, just body
  // instead of query string.
  app.post("/api/lookup", async (c) => {
    const body = await c.req.json().catch(() => ({}) as any);
    return handleLookup(c, { domain: body.domain });
  });
}
