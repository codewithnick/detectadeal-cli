import { SITE_URL, type Deal, type Offer } from './api.js';

/** Product page on detectadeal.com (price history, alerts, similar deals). */
export function productUrl(deal: Pick<Deal, 'asin'>): string {
  return `${SITE_URL}/p/${encodeURIComponent(deal.asin)}`;
}

/** Store name from the listing, else from the source URL, else the ASIN prefix. */
export function storeOf(deal: Deal): string {
  if (deal.store_name) return deal.store_name;
  const host = hostOf(deal.source_url);
  if (host) return prettyHost(host);
  const prefix = deal.asin.split('-')[0];
  if (prefix && prefix !== deal.asin) return titleCase(prefix.toLowerCase());
  return 'Amazon';
}

function hostOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function prettyHost(host: string): string {
  const name = host.split('.')[0];
  return titleCase(name);
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function rupees(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return '-';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function percent(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n === null || n <= 0) return '-';
  return `${Math.round(n)}%`;
}

export function truncate(text: string, width: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= width) return clean;
  return `${clean.slice(0, Math.max(0, width - 1))}…`;
}

export function pad(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const len = [...text].length;
  if (len >= width) return text;
  const fill = ' '.repeat(width - len);
  return align === 'left' ? text + fill : fill + text;
}

export interface Column<T> {
  header: string;
  width: number;
  align?: 'left' | 'right';
  /** Links must never be cut; the column grows instead. */
  truncate?: boolean;
  value: (row: T) => string;
}

/** Plain text table, no dependency, safe to pipe. */
export function table<T>(rows: T[], columns: Column<T>[]): string {
  const head = columns.map((c) => pad(c.header, c.width, c.align)).join('  ');
  const rule = columns.map((c) => '-'.repeat(c.width)).join('  ');
  const body = rows.map((row) =>
    columns
      .map((c) =>
        pad(c.truncate === false ? c.value(row) : truncate(c.value(row), c.width), c.width, c.align)
      )
      .join('  ')
  );
  return [head, rule, ...body].join('\n');
}

export function dealColumns(): Column<Deal>[] {
  return [
    { header: 'Price', width: 9, align: 'right', value: (d) => rupees(d.current_price) },
    { header: 'Off', width: 4, align: 'right', value: (d) => percent(d.discount_percentage) },
    { header: 'Store', width: 9, value: storeOf },
    { header: 'Deal', width: 48, value: (d) => d.title },
    { header: 'Price history', width: 44, truncate: false, value: productUrl },
  ];
}

export function offerColumns(): Column<Offer>[] {
  return [
    { header: 'Store', width: 18, value: (o) => o.campaign_name ?? '-' },
    { header: 'Code', width: 12, value: (o) => o.coupon_code ?? 'no code' },
    { header: 'Offer', width: 50, value: (o) => o.title },
    { header: 'Ends', width: 10, value: (o) => (o.end_date ? o.end_date.slice(0, 10) : '-') },
  ];
}

export function dealJson(deal: Deal) {
  return {
    asin: deal.asin,
    title: deal.title,
    store: storeOf(deal),
    category: deal.category ?? null,
    price: toNumber(deal.current_price),
    original_price: toNumber(deal.original_price),
    discount_percent: toNumber(deal.discount_percentage),
    rating: toNumber(deal.rating),
    availability: deal.availability_status ?? null,
    price_checked_at: deal.last_scraped_at ?? null,
    page: productUrl(deal),
    buy: deal.short_url ?? deal.affiliate_url ?? null,
  };
}
