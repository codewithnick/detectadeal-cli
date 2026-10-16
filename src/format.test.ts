import { describe, expect, it } from 'vitest';
import {
  dealJson,
  percent,
  productUrl,
  rupees,
  storeOf,
  table,
  truncate,
} from './format.js';
import type { Deal } from './api.js';

const base: Deal = { id: '1', asin: 'B081FH7R7D', title: 'Wayona USB-C cable' };

describe('productUrl', () => {
  it('links to the price history page on detectadeal.com', () => {
    expect(productUrl(base)).toBe('https://www.detectadeal.com/p/B081FH7R7D');
  });
  it('encodes unusual ASINs', () => {
    expect(productUrl({ asin: 'MYNTRA-38 81' })).toBe(
      'https://www.detectadeal.com/p/MYNTRA-38%2081'
    );
  });
});

describe('storeOf', () => {
  it('prefers the listing store name', () => {
    expect(storeOf({ ...base, store_name: 'Croma' })).toBe('Croma');
  });
  it('falls back to the source host', () => {
    expect(storeOf({ ...base, source_url: 'https://www.flipkart.com/x' })).toBe('Flipkart');
  });
  it('falls back to the ASIN prefix', () => {
    expect(storeOf({ ...base, asin: 'MYNTRA-3881C6B5D1' })).toBe('Myntra');
  });
  it('defaults to Amazon for bare ASINs', () => {
    expect(storeOf(base)).toBe('Amazon');
  });
});

describe('money and percent', () => {
  it('formats rupees with Indian grouping', () => {
    expect(rupees('10499.00')).toBe('₹10,499');
    expect(rupees(1234567)).toBe('₹12,34,567');
    expect(rupees(null)).toBe('-');
  });
  it('formats discounts', () => {
    expect(percent('80')).toBe('80%');
    expect(percent(0)).toBe('-');
    expect(percent(undefined)).toBe('-');
  });
});

describe('table', () => {
  it('pads and truncates columns', () => {
    const out = table(
      [{ a: 'a very long value' }],
      [{ header: 'A', width: 6, value: (r) => r.a }]
    );
    expect(out.split('\n')).toEqual(['A     ', '------', 'a ver…']);
  });
  it('right-aligns numeric columns', () => {
    const out = table([{ p: '₹99' }], [{ header: 'P', width: 6, align: 'right', value: (r) => r.p }]);
    expect(out.split('\n')[2]).toBe('   ₹99');
  });
});

describe('truncate', () => {
  it('collapses whitespace', () => {
    expect(truncate('a   b\n c', 10)).toBe('a b c');
  });
});

describe('dealJson', () => {
  it('exposes a stable, numeric shape', () => {
    expect(
      dealJson({
        ...base,
        current_price: '10499.00',
        original_price: '19999',
        discount_percentage: '47',
        short_url: 'https://www.detectadeal.com/s/abc',
      })
    ).toMatchObject({
      asin: 'B081FH7R7D',
      price: 10499,
      original_price: 19999,
      discount_percent: 47,
      page: 'https://www.detectadeal.com/p/B081FH7R7D',
      buy: 'https://www.detectadeal.com/s/abc',
    });
  });
});
