# detectadeal CLI: Amazon India and Flipkart price drops, price history and coupon codes in your terminal

[![CI](https://github.com/codewithnick/detectadeal-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/codewithnick/detectadeal-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/detectadeal.svg)](https://www.npmjs.com/package/detectadeal)
[![License: MIT](https://img.shields.io/badge/code-MIT-green.svg)](LICENSE)
[![Data terms](https://img.shields.io/badge/deal%20data-detectadeal-orange.svg)](DATA-TERMS.md)

`detectadeal` is a command-line price tracker for India. It shows today's
biggest price drops, searches live deals across Amazon India, Flipkart,
Myntra, Ajio, Croma, Nykaa, JioMart and 250+ other stores, lists active
coupon codes, and can watch a product until it reaches your price. Every
result links to its **price history page on [detectadeal.com](https://www.detectadeal.com)**,
so you can see whether a "70% off" sale price is a real drop or a marked-up
list price before you buy.

Built on the public [detectadeal](https://www.detectadeal.com) API. No
account, no API key, no scraping of store pages from your machine.

```
$ npx detectadeal search wireless earbuds -n 3 --max-price 2000

    Price   Off  Store      Deal                                              Price history
---------  ----  ---------  ------------------------------------------------  --------------------------------------------
     ₹300   81%  Flipkart   allons TWS Bluetooth Earbuds True Wireless Head…  https://www.detectadeal.com/p/ACCHFYEJ73HY6DCC
     ₹458   85%  Flipkart   Caidea TW500 Tube Upto 50H Playtime*, ENC, Fast…  https://www.detectadeal.com/p/ACCHEJXCXZ4PEWPW

More results and price history: https://www.detectadeal.com/search/wireless%20earbuds
```

## Install

Node.js 18 or newer.

```sh
npm install -g detectadeal      # or run once with: npx detectadeal
detectadeal --help
```

## Commands

| Command | What it does |
|---|---|
| `detectadeal drops` | Today's biggest price drops across all stores. Same data as [Price Drops on detectadeal](https://www.detectadeal.com/deals/price-drops). |
| `detectadeal search <query>` | Search deals, e.g. `detectadeal search wireless earbuds -p 2000`. |
| `detectadeal deals -c <category>` | Browse a category, e.g. `-c mobiles -d 30` for mobiles with at least 30% off. |
| `detectadeal coupons [store]` | Active coupon codes and offers, e.g. `detectadeal coupons myntra --codes-only`. |
| `detectadeal categories` | All deal categories with live counts and their browse links. |
| `detectadeal watch <query> -b <price>` | Poll a search and print deals at or below your price, e.g. `watch "iphone 15" -b 55000`. |

Common options:

| Option | Meaning |
|---|---|
| `-n, --limit <n>` | Rows to show (default 20). |
| `-s, --store <name>` | Only one store: `amazon`, `flipkart`, `myntra`, `ajio`, `croma`, `nykaa`, `jiomart`… |
| `-p, --max-price <rupees>` | Hide search results above this price. |
| `-d, --min-discount <percent>` | Minimum discount for `deals`. |
| `--json` | Machine-readable output for scripts (see below). |

### Examples

```sh
# Amazon India price drops right now
detectadeal drops --store amazon

# Flipkart mobiles with at least 40% off, highest discount first
detectadeal deals --category mobiles --store flipkart --min-discount 40 --sort discount

# Cheapest TWS earbuds under ₹1,500
detectadeal search tws earbuds --max-price 1500

# Myntra coupon codes only
detectadeal coupons myntra --codes-only

# Tell me when an iPhone 15 drops to ₹55,000 or less (checks every 15 min)
detectadeal watch iphone 15 --below 55000
```

### JSON output

Every command accepts `--json`. Deals come out as a stable, numeric shape:

```json
[
  {
    "asin": "B081FH7R7D",
    "title": "Wayona USB C Cable 65W Quick Charge Fast Charging Data Transfer (1M, Grey)",
    "store": "Amazon",
    "category": "electronics",
    "price": 284,
    "original_price": 999,
    "discount_percent": 72,
    "rating": null,
    "availability": null,
    "price_checked_at": "2026-10-11T14:48:52.981Z",
    "page": "https://www.detectadeal.com/p/B081FH7R7D",
    "buy": "https://www.amazon.in/dp/B081FH7R7D?tag=sirfdiscount-21"
  }
]
```

`page` is the product's price history page. `buy` is detectadeal's tracked
link to the store. If you republish deals from this output you must keep
`buy` exactly as returned. See [Deal data terms](DATA-TERMS.md).

Pipe it anywhere:

```sh
detectadeal --json drops | jq '.[] | select(.discount_percent >= 60) | .title'
```

## Why price history matters

Indian sale events (Big Billion Days, Great Indian Festival, Diwali, Prime
Day) are full of discounts measured against inflated list prices. A price
history chart shows the real lowest price of the last months, so you know
whether to buy now or wait. The CLI gives you the list; the
[detectadeal product pages](https://www.detectadeal.com/deals) give you the
chart, the lowest-ever price, similar deals and a one-click price alert.

Useful reads from the detectadeal blog:

- [Amazon price history: how to spot fake discounts](https://www.detectadeal.com/blogs/amazon-price-history-feature-spot-fake-discounts)
- [The ultimate guide to price tracking in India](https://www.detectadeal.com/blogs/ultimate-guide-price-tracking)
- [Best time to buy on Amazon and Flipkart](https://www.detectadeal.com/blogs/best-time-to-buy-amazon-flipkart-india-timing)
- [How to set a price alert for Amazon and Flipkart](https://www.detectadeal.com/blogs/how-to-set-price-alert-amazon-flipkart-detectadeal)
- [Big Billion Days vs Great Indian Festival: which is better?](https://www.detectadeal.com/blogs/big-billion-days-vs-great-indian-festival-which-is-better)
- [Is "only 2 left in stock" real?](https://www.detectadeal.com/blogs/is-only-2-left-in-stock-real-amazon-flipkart)
- [What are price glitches and how to find them](https://www.detectadeal.com/blogs/what-are-price-glitches-and-how-to-look-for-them)
- [No-cost EMI in India: the hidden charges](https://www.detectadeal.com/blogs/no-cost-emi-india-hidden-charges-truth)

## About detectadeal

[detectadeal.com](https://www.detectadeal.com) is a free deal finder and
price tracker for Indian online shopping. It tracks prices across Amazon
India, Flipkart, Myntra, Ajio, Nykaa, Croma, JioMart, Meesho, Tata CLiQ and
hundreds more, and gives every product a price history, a "real discount"
check and free price-drop alerts.

- **Price drops:** [detectadeal.com/deals/price-drops](https://www.detectadeal.com/deals/price-drops)
- **Trending deals:** [detectadeal.com/deals/trending](https://www.detectadeal.com/deals/trending)
- **Coupons and store offers:** [detectadeal.com/offers](https://www.detectadeal.com/offers)
- **Browse by store:** [detectadeal.com/stores](https://www.detectadeal.com/stores)
- **Browse by brand:** [detectadeal.com/brands](https://www.detectadeal.com/brands)
- **Price alerts:** [How it works](https://www.detectadeal.com/how-it-works)
- **Telegram channel:** [t.me/detect_a_deal](https://t.me/detect_a_deal)
- **Android app:** [DetectADeal on Google Play](https://play.google.com/store/apps/details?id=com.detectadeal)

Popular categories: [Electronics](https://www.detectadeal.com/deals/electronics) ·
[Mobiles](https://www.detectadeal.com/deals/mobiles) ·
[Computers and laptops](https://www.detectadeal.com/deals/computers) ·
[Audio](https://www.detectadeal.com/deals/audio) ·
[Home and kitchen](https://www.detectadeal.com/deals/home) ·
[Fashion](https://www.detectadeal.com/deals/fashion) ·
[Clothing](https://www.detectadeal.com/deals/clothing) ·
[Footwear](https://www.detectadeal.com/deals/footwear) ·
[Health](https://www.detectadeal.com/deals/health) ·
[Books](https://www.detectadeal.com/deals/books) ·
[Gaming](https://www.detectadeal.com/deals/gaming) ·
[Baby](https://www.detectadeal.com/deals/baby) ·
[Sports](https://www.detectadeal.com/deals/sports) ·
[Automotive](https://www.detectadeal.com/deals/automotive)

## Being a good API citizen

The CLI makes one request at a time with a one-second gap, identifies
itself with a `detectadeal-cli/<version>` User-Agent, and `watch` polls no
more often than every 5 minutes. The API is rate-limited per IP. If you get
a "rate limited" message, wait a few minutes. For instant push alerts
without a terminal, use the free alerts on detectadeal.com.

Point the client at another host with `DETECTADEAL_API_URL` if you are
running your own instance.

## Licence and data terms

- **Code:** [MIT](LICENSE). Fork it, ship it, build on it.
- **Deal data:** owned by detectadeal and licensed only under the
  [Deal data terms](DATA-TERMS.md). In short: personal use is fine, credit
  detectadeal.com, keep the affiliate links exactly as returned, and do not
  redistribute the data as a dataset or feed.

## Contributing

Issues and pull requests are welcome. Run `npm install`, `npm run build`,
`npm test`. The code is small: `src/api.ts` (client), `src/commands.ts`
(commands), `src/format.ts` (tables and links).
