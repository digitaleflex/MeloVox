import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  '169.254.169.254',
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = ip.replace(/^\[|\]$/g, '').toLowerCase();

  if (net.isIPv4(cleaned)) {
    const parts = cleaned.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  if (net.isIPv6(cleaned)) {
    if (cleaned === '::' || cleaned === '::1') return true;
    if (cleaned.startsWith('fe80:')) return true; // link-local
    if (cleaned.startsWith('fc') || cleaned.startsWith('fd')) return true; // ULA fc00::/7
    if (cleaned.startsWith('::ffff:')) {
      const mapped = cleaned.slice(7);
      return isPrivateOrReservedIp(mapped);
    }
    return false;
  }

  return true;
}

export function validateExternalAudioUrl(rawUrl: string): {
  valid: boolean;
  url?: URL;
  error?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, error: 'URL invalide. Utilisez une adresse HTTP ou HTTPS complète.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Seuls les protocoles HTTP et HTTPS sont autorisés.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    return { valid: false, error: 'Accès interdit aux hôtes locaux ou internes (protection SSRF).' };
  }

  if (net.isIP(host) && isPrivateOrReservedIp(host)) {
    return { valid: false, error: 'Accès interdit aux plages IP privées ou réservées.' };
  }

  return { valid: true, url: parsed };
}
