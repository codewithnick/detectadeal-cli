#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { ApiError, SITE_URL, TERMS_URL, VERSION, createClient } from './api.js';
import * as commands from './commands.js';

function int(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) throw new InvalidArgumentError('Expected a positive number.');
  return n;
}

function money(value: string): number {
  const n = Number(value.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) throw new InvalidArgumentError('Expected a price in rupees.');
  return n;
}

const program = new Command();

program
  .name('detectadeal')
  .description(
    [
      'Price drops, deal search, coupon codes and price watching for Amazon India,',
      'Flipkart, Myntra and 250+ other Indian stores, from the terminal.',
      '',
      `Every result links to its price history page on ${SITE_URL}.`,
    ].join('\n')
  )
  .addHelpText(
    'after',
    [
      '',
      'Data terms: the code is MIT, the deal data is not. Deal data belongs to',
      'detectadeal. If you republish it, keep the affiliate links exactly as',
      `returned and credit detectadeal.com. Full terms: ${TERMS_URL}`,
    ].join('\n')
  )
  .version(VERSION)
  .option('--json', 'print JSON instead of a table', false)
  .showHelpAfterError();

const client = createClient();
const out = (): commands.Output => ({
  log: (line) => console.log(line),
  json: Boolean(program.opts().json),
});

program
  .command('drops')
  .description("today's biggest price drops")
  .option('-n, --limit <n>', 'rows to show', int, 20)
  .option('-s, --store <name>', 'only this store, e.g. amazon, flipkart, myntra')
  .action((opts) => run(() => commands.drops(client, out(), opts)));

program
  .command('deals')
  .description('browse live deals, newest first')
  .option('-n, --limit <n>', 'rows to show', int, 20)
  .option('-c, --category <slug>', 'category slug, e.g. electronics, mobiles, footwear')
  .option('-d, --min-discount <percent>', 'minimum discount percent', int)
  .option('-s, --store <name>', 'only this store')
  .option('--sort <order>', 'newest | discount | rating | price', 'newest')
  .action((opts) => run(() => commands.deals(client, out(), opts)));

program
  .command('search')
  .argument('<query...>', 'what you are looking for, e.g. "wireless earbuds"')
  .description('search deals across stores')
  .option('-n, --limit <n>', 'rows to show', int, 20)
  .option('-s, --store <name>', 'only this store')
  .option('-p, --max-price <rupees>', 'hide results above this price', money)
  .action((query: string[], opts) =>
    run(() => commands.search(client, out(), query.join(' '), opts))
  );

program
  .command('coupons')
  .argument('[store]', 'store name filter, e.g. myntra, ajio, nykaa')
  .description('active coupon codes and store offers')
  .option('-n, --limit <n>', 'rows to show', int, 20)
  .option('--codes-only', 'only offers that have a coupon code', false)
  .action((store: string | undefined, opts) =>
    run(() => commands.coupons(client, out(), { ...opts, store }))
  );

program
  .command('categories')
  .description('deal categories with live counts')
  .option('-n, --limit <n>', 'rows to show', int, 30)
  .action((opts) => run(() => commands.categories(client, out(), opts.limit)));

program
  .command('watch')
  .argument('<query...>', 'what to watch, e.g. "iphone 15"')
  .description('poll a search and print deals that reach your price')
  .option('-b, --below <rupees>', 'alert when the price is at or below this', money)
  .option('-i, --interval <minutes>', 'minutes between checks (min 5)', int, 15)
  .option('-s, --store <name>', 'only this store')
  .action((query: string[], opts) =>
    run(() =>
      commands.watch(client, out(), query.join(' '), {
        below: opts.below,
        intervalMinutes: opts.interval,
        store: opts.store,
      })
    )
  );

async function run(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`detectadeal: ${error.message}`);
      process.exitCode = error.status === 429 ? 3 : 2;
      return;
    }
    throw error;
  }
}

program.parseAsync(process.argv);
