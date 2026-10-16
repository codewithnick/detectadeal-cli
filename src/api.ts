/**
 * Thin client for the public detectadeal API.
 *
 * Polite by design: one request at a time, a short gap between calls, and a
 * User-Agent that names this tool so the service can throttle it if needed.
 */
import { request as httpsRequest } from 'node:https';

export const SITE_URL = 'https://www.detectadeal.com';
export const DEFAULT_API_URL = 'https://api.detectadeal.com';
export const VERSION = '0.1.0';
export const TERMS_URL = 'https://github.com/codewithnick/detectadeal-cli/blob/main/DATA-TERMS.md';

const MIN_GAP_MS = 1000;
const REQUEST_TIMEOUT_MS = 20_000;
let lastCallAt = 0;

export interface Deal {
  id: string;
  asin: string;
  title: string;
  category?: string | null;
  brand?: string | null;
  current_price?: string | number | null;
  original_price?: string | number | null;
  discount_percentage?: string | number | null;
  rating?: string | number | null;
  review_count?: number | null;
  source?: string | null;
  source_url?: string | null;
  store_name?: string | null;
  short_url?: string | null;
  affiliate_url?: string | null;
  availability_status?: string | null;
  last_scraped_at?: string | null;
  created_at?: string | null;
}

export interface DealsPage {
  deals: Deal[];
  total: number;
  hasMore: boolean;
}

export interface Offer {
  id: string;
  campaign_name?: string | null;
  title: string;
  description?: string | null;
  type?: string | null;
  coupon_code?: string | null;
  affiliate_url?: string | null;
  url?: string | null;
  end_date?: string | null;
}

export interface OffersPage {
  offers: Offer[];
  total: number;
  hasMore: boolean;
}

export interface DealsQuery {
  limit?: number;
  offset?: number;
  category?: string;
  minDiscount?: number;
  sort?: 'newest' | 'discount' | 'rating' | 'price';
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** What a transport returns: enough to build the API result. */
export interface Transport {
  (url: string, headers: Record<string, string>): Promise<{ status: number; body: string }>;
}

/**
 * Default transport on node:https.
 *
 * Not fetch: the API host has an IPv6 address, and on IPv4-only networks
 * Node's fetch can hang on the unreachable v6 route until it times out.
 * Here a network error on the first try is retried over IPv4.
 */
export const httpsTransport: Transport = async (url, headers) => {
  const attempt = (family?: 4) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = httpsRequest(
        url,
        { method: 'GET', headers, family, timeout: REQUEST_TIMEOUT_MS },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
          );
          res.on('error', reject);
        }
      );
      req.on('timeout', () => req.destroy(new Error('timed out')));
      req.on('error', reject);
      req.end();
    });

  try {
    return await attempt();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
      return attempt(4);
    }
    throw error;
  }
};

/** Adapter so tests can pass a fetch-like function. */
export function fetchTransport(fetchImpl: typeof fetch): Transport {
  return async (url, headers) => {
    const res = await fetchImpl(url, { headers });
    return { status: res.status, body: await res.text() };
  };
}

export interface ClientOptions {
  baseUrl?: string;
  transport?: Transport;
  /** Tests set this to 0. */
  minGapMs?: number;
}

export function createClient(options: ClientOptions = {}) {
  const baseUrl = (
    options.baseUrl ??
    process.env.DETECTADEAL_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/$/, '');
  const transport = options.transport ?? httpsTransport;
  const minGap = options.minGapMs ?? MIN_GAP_MS;

  async function get<T>(
    path: string,
    params: Record<string, string | number | undefined>
  ): Promise<T> {
    const wait = lastCallAt + minGap - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();

    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const url = `${baseUrl}${path}${search.size ? `?${search}` : ''}`;

    let res: { status: number; body: string };
    try {
      res = await transport(url, {
        accept: 'application/json',
        'user-agent': `detectadeal-cli/${VERSION} (+${SITE_URL})`,
      });
    } catch (error) {
      throw new ApiError(`Could not reach ${baseUrl}: ${(error as Error).message}`);
    }
    if (res.status === 429) {
      throw new ApiError(
        'Rate limited by the detectadeal API. Wait a few minutes and try again.',
        429
      );
    }
    if (res.status < 200 || res.status >= 300) {
      throw new ApiError(`detectadeal API returned ${res.status} for ${path}`, res.status);
    }
    let body: { success?: boolean; data?: T; message?: string };
    try {
      body = JSON.parse(res.body);
    } catch {
      throw new ApiError(`detectadeal API returned something that is not JSON for ${path}`);
    }
    if (body.success === false || body.data === undefined) {
      throw new ApiError(body.message ?? `Unexpected response from ${path}`);
    }
    return body.data;
  }

  function toDealsPage(data: {
    deals?: Deal[];
    total?: number;
    totalCount?: number;
    hasMore?: boolean;
  }): DealsPage {
    const deals = data.deals ?? [];
    const total = Number(data.totalCount ?? data.total ?? deals.length);
    return { deals, total, hasMore: Boolean(data.hasMore) };
  }

  return {
    baseUrl,

    async deals(query: DealsQuery = {}): Promise<DealsPage> {
      return toDealsPage(
        await get('/api/deals', {
          limit: query.limit ?? 20,
          offset: query.offset,
          category: query.category,
          minDiscount: query.minDiscount,
          sort: query.sort ?? 'newest',
        })
      );
    },

    async priceDrops(limit = 20): Promise<DealsPage> {
      return toDealsPage(await get('/api/deals/price-drops', { limit }));
    },

    async search(term: string, limit = 20): Promise<DealsPage> {
      return toDealsPage(await get('/api/search', { search: term, limit }));
    },

    async offers(page = 1, perPage = 20): Promise<OffersPage> {
      const data = await get<{
        offers?: Offer[];
        total?: number;
        has_more?: boolean;
      }>('/api/offers', { page, per_page: perPage });
      return {
        offers: data.offers ?? [],
        total: Number(data.total ?? 0),
        hasMore: Boolean(data.has_more),
      };
    },

    async categories(): Promise<Array<{ slug: string; count: number }>> {
      const data = await get<{
        categories?: Array<{ slug: string; count?: number }>;
      }>('/api/categories', {});
      return (data.categories ?? []).map((c) => ({
        slug: c.slug,
        count: Number(c.count ?? 0),
      }));
    },
  };
}

export type Client = ReturnType<typeof createClient>;
