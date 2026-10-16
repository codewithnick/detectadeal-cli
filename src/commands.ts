import { SITE_URL, type Client, type Deal, type Offer } from './api.js';
import {
  dealColumns,
  dealJson,
  offerColumns,
  productUrl,
  rupees,
  storeOf,
  table,
  toNumber,
} from './format.js';

export interface Output {
  log: (line: string) => void;
  json: boolean;
}

function matchesStore(deal: Deal, store?: string): boolean {
  if (!store) return true;
  return storeOf(deal).toLowerCase().includes(store.toLowerCase());
}

function printDeals(out: Output, deals: Deal[], footer?: string): void {
  if (out.json) {
    out.log(JSON.stringify(deals.map(dealJson), null, 2));
    return;
  }
  if (deals.length === 0) {
    out.log('No deals matched.');
    return;
  }
  out.log(table(deals, dealColumns()));
  if (footer) out.log(`\n${footer}`);
}

export async function drops(
  client: Client,
  out: Output,
  opts: { limit: number; store?: string }
): Promise<void> {
  const page = await client.priceDrops(opts.limit);
  const deals = page.deals.filter((d) => matchesStore(d, opts.store));
  printDeals(
    out,
    deals,
    `Full list with price charts: ${SITE_URL}/deals/price-drops`
  );
}

export async function deals(
  client: Client,
  out: Output,
  opts: {
    limit: number;
    category?: string;
    minDiscount?: number;
    store?: string;
    sort?: 'newest' | 'discount' | 'rating' | 'price';
  }
): Promise<void> {
  const page = await client.deals({
    limit: opts.limit,
    category: opts.category,
    minDiscount: opts.minDiscount,
    sort: opts.sort,
  });
  const list = page.deals.filter((d) => matchesStore(d, opts.store));
  const hub = opts.category
    ? `${SITE_URL}/deals/${encodeURIComponent(opts.category)}`
    : `${SITE_URL}/deals`;
  printDeals(out, list, `${page.total.toLocaleString('en-IN')} live deals. Browse: ${hub}`);
}

export async function search(
  client: Client,
  out: Output,
  term: string,
  opts: { limit: number; store?: string; maxPrice?: number }
): Promise<void> {
  const page = await client.search(term, opts.limit);
  const list = page.deals.filter((d) => {
    if (!matchesStore(d, opts.store)) return false;
    if (opts.maxPrice === undefined) return true;
    const price = toNumber(d.current_price);
    return price !== null && price <= opts.maxPrice;
  });
  printDeals(
    out,
    list,
    `More results and price history: ${SITE_URL}/search/${encodeURIComponent(term)}`
  );
}

export async function coupons(
  client: Client,
  out: Output,
  opts: { limit: number; store?: string; codesOnly: boolean }
): Promise<void> {
  const collected: Offer[] = [];
  let pageNo = 1;
  // The offers feed is paginated; pull pages until we have enough matches.
  while (collected.length < opts.limit && pageNo <= 10) {
    const page = await client.offers(pageNo, 50);
    for (const offer of page.offers) {
      if (opts.codesOnly && !offer.coupon_code) continue;
      if (
        opts.store &&
        !(offer.campaign_name ?? '').toLowerCase().includes(opts.store.toLowerCase())
      )
        continue;
      collected.push(offer);
      if (collected.length >= opts.limit) break;
    }
    if (!page.hasMore) break;
    pageNo += 1;
  }
  if (out.json) {
    out.log(
      JSON.stringify(
        collected.map((o) => ({
          store: o.campaign_name ?? null,
          title: o.title,
          code: o.coupon_code ?? null,
          type: o.type ?? null,
          ends: o.end_date ?? null,
          link: o.affiliate_url ?? o.url ?? null,
        })),
        null,
        2
      )
    );
    return;
  }
  if (collected.length === 0) {
    out.log('No offers matched.');
    return;
  }
  out.log(table(collected, offerColumns()));
  out.log(`\nAll coupon codes and store offers: ${SITE_URL}/offers`);
}

export async function categories(client: Client, out: Output, top: number): Promise<void> {
  const list = (await client.categories()).sort((a, b) => b.count - a.count).slice(0, top);
  if (out.json) {
    out.log(JSON.stringify(list, null, 2));
    return;
  }
  out.log(
    table(list, [
      { header: 'Deals', width: 6, align: 'right', value: (c) => String(c.count) },
      { header: 'Category', width: 28, value: (c) => c.slug },
      { header: 'Browse', width: 60, value: (c) => `${SITE_URL}/deals/${c.slug}` },
    ])
  );
}

export interface WatchOptions {
  below?: number;
  intervalMinutes: number;
  store?: string;
  /** Tests stop the loop after this many polls. */
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Poll a search every N minutes and print deals that fall at or below a
 * price. Minimum interval is 5 minutes: this is a convenience, not a scraper.
 * For instant push alerts use the free alerts on detectadeal.com.
 */
export async function watch(
  client: Client,
  out: Output,
  term: string,
  opts: WatchOptions
): Promise<void> {
  const interval = Math.max(5, opts.intervalMinutes) * 60_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const seen = new Set<string>();
  const target = opts.below;
  out.log(
    `Watching "${term}"${target !== undefined ? ` for prices at or below ${rupees(target)}` : ''}, every ${interval / 60_000} min. Ctrl-C to stop.`
  );
  out.log(`Tip: ${SITE_URL}/deals/personalized sends alerts without keeping a terminal open.\n`);

  let polls = 0;
  for (;;) {
    polls += 1;
    const page = await client.search(term, 50);
    const hits = page.deals.filter((d) => {
      if (seen.has(d.asin)) return false;
      if (!matchesStore(d, opts.store)) return false;
      const price = toNumber(d.current_price);
      if (price === null) return false;
      return target === undefined || price <= target;
    });
    for (const d of hits) {
      seen.add(d.asin);
      out.log(
        `\u0007${new Date().toLocaleTimeString('en-IN')}  ${rupees(d.current_price)}  ${storeOf(d)}  ${d.title}\n    ${productUrl(d)}`
      );
    }
    if (hits.length === 0 && polls === 1) out.log('Nothing at that price yet. Still watching.');
    if (opts.maxPolls !== undefined && polls >= opts.maxPolls) return;
    await sleep(interval);
  }
}
