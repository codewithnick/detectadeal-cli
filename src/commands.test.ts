import { describe, expect, it, vi } from 'vitest';
import { createClient, fetchTransport } from './api.js';
import * as commands from './commands.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function fakeFetch(routes: Record<string, (url: URL) => unknown>) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    const handler = routes[url.pathname];
    if (!handler) return jsonResponse({ success: false, message: 'no route' }, 404);
    return jsonResponse({ success: true, data: handler(url) });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function capture() {
  const lines: string[] = [];
  return { lines, out: { log: (l: string) => lines.push(l), json: false } };
}

const deal = (asin: string, price: string, title = `Deal ${asin}`) => ({
  id: asin,
  asin,
  title,
  current_price: price,
  discount_percentage: '40',
  source_url: 'https://www.amazon.in/dp/' + asin,
});

describe('client', () => {
  it('sends a named user agent and the right query', async () => {
    const { fetchImpl, calls } = fakeFetch({
      '/api/deals': () => ({ deals: [deal('A1', '100')], totalCount: 1, hasMore: false }),
    });
    const client = createClient({ transport: fetchTransport(fetchImpl), minGapMs: 0, baseUrl: 'https://x.test/' });
    const page = await client.deals({ category: 'mobiles', minDiscount: 30, limit: 5 });
    expect(page.total).toBe(1);
    expect(calls[0]).toBe('/api/deals?limit=5&category=mobiles&minDiscount=30&sort=newest');
    const headers = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(headers['user-agent']).toMatch(/^detectadeal-cli\/\d+\.\d+\.\d+/);
  });

  it('explains rate limiting', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 429 })) as unknown as typeof fetch;
    const client = createClient({ transport: fetchTransport(fetchImpl), minGapMs: 0 });
    await expect(client.search('x')).rejects.toMatchObject({ status: 429 });
  });
});

describe('search', () => {
  it('filters by store and max price, and links to the site', async () => {
    const { fetchImpl } = fakeFetch({
      '/api/search': () => ({
        deals: [
          deal('A1', '999'),
          deal('A2', '4999'),
          { ...deal('M1', '500'), source_url: 'https://www.myntra.com/x' },
        ],
        totalCount: 3,
      }),
    });
    const client = createClient({ transport: fetchTransport(fetchImpl), minGapMs: 0 });
    const { lines, out } = capture();
    await commands.search(client, out, 'earbuds', { limit: 20, store: 'amazon', maxPrice: 2000 });
    const text = lines.join('\n');
    expect(text).toContain('Deal A1');
    expect(text).not.toContain('Deal A2');
    expect(text).not.toContain('Deal M1');
    expect(text).toContain('https://www.detectadeal.com/p/A1');
    expect(text).toContain('https://www.detectadeal.com/search/earbuds');
  });

  it('prints JSON when asked', async () => {
    const { fetchImpl } = fakeFetch({
      '/api/search': () => ({ deals: [deal('A1', '999')], totalCount: 1 }),
    });
    const client = createClient({ transport: fetchTransport(fetchImpl), minGapMs: 0 });
    const { lines, out } = capture();
    await commands.search(client, { ...out, json: true }, 'x', { limit: 5 });
    const parsed = JSON.parse(lines[0]);
    expect(parsed[0]).toMatchObject({ asin: 'A1', price: 999, store: 'Amazon' });
  });
});

describe('coupons', () => {
  it('walks pages until it has enough coupon codes', async () => {
    const { fetchImpl, calls } = fakeFetch({
      '/api/offers': (url) => {
        const page = Number(url.searchParams.get('page'));
        return {
          offers: [
            { id: `${page}a`, campaign_name: 'Myntra', title: `Offer ${page}a`, coupon_code: null },
            { id: `${page}b`, campaign_name: 'Myntra', title: `Offer ${page}b`, coupon_code: `CODE${page}` },
          ],
          total: 4,
          has_more: page < 2,
        };
      },
    });
    const client = createClient({ transport: fetchTransport(fetchImpl), minGapMs: 0 });
    const { lines, out } = capture();
    await commands.coupons(client, out, { limit: 2, store: 'myntra', codesOnly: true });
    expect(calls).toHaveLength(2);
    const text = lines.join('\n');
    expect(text).toContain('CODE1');
    expect(text).toContain('CODE2');
    expect(text).not.toContain('Offer 1a');
  });
});

describe('watch', () => {
  it('reports a deal once when it reaches the target price', async () => {
    let poll = 0;
    const { fetchImpl } = fakeFetch({
      '/api/search': () => {
        poll += 1;
        return { deals: [deal('A1', poll === 1 ? '60000' : '54999', 'iPhone 15')], totalCount: 1 };
      },
    });
    const client = createClient({ transport: fetchTransport(fetchImpl), minGapMs: 0 });
    const { lines, out } = capture();
    await commands.watch(client, out, 'iphone 15', {
      below: 55000,
      intervalMinutes: 1,
      maxPolls: 3,
      sleep: async () => {},
    });
    const hits = lines.filter((l) => l.includes('iPhone 15') && l.includes('₹54,999'));
    expect(hits).toHaveLength(1);
    expect(lines[0]).toContain('every 5 min');
  });
});
