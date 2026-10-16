# Deal data terms

The code in this repository is open source under the [MIT License](LICENSE).
**The deal data is not.** This page explains what you may do with the data
the tool returns.

## Ownership

Everything the `detectadeal` CLI fetches (deal listings, prices, price
history, discounts, availability, coupon codes, store offers, product
links, affiliate links, categories and rankings, together "Deal Data") is
collected, cleaned, de-duplicated and ranked by detectadeal and is provided
by the detectadeal API at `api.detectadeal.com`. Deal Data is owned by
detectadeal (https://www.detectadeal.com). Your use of the API and of Deal
Data is governed by the detectadeal Terms of Service at
https://www.detectadeal.com/terms. These terms apply in addition to the
site terms and whichever is stricter wins.

Nothing in the MIT License grants any right to Deal Data. Forking,
modifying or redistributing the code does not change these data terms.

## What you may do

- Use the CLI for personal, non-commercial deal hunting.
- Show Deal Data in your own scripts, dashboards, bots or posts **with the
  product links and affiliate links exactly as returned**, and with a visible
  credit to detectadeal.com.
- Build tools on the public API at a reasonable, human-paced request rate.

## What you must do if you reuse or republish Deal Data

1. **Keep the affiliate links.** Any link you republish for a deal obtained
   from the API or this tool must be the `buy` / `affiliate_url` /
   `short_url` value exactly as returned by detectadeal. You may not replace,
   rewrite, strip, re-tag or redirect those links, and you may not substitute
   your own affiliate, referral or tracking identifiers.
2. **Credit the source.** Name detectadeal.com and link to the product's
   price history page (`https://www.detectadeal.com/p/<asin>`) wherever the
   deal is shown.
3. **Keep the data current.** Do not present a price or availability as
   current more than 24 hours after you fetched it.

## What you may not do

- Bulk-extract, mirror, cache long-term, or redistribute Deal Data as a
  dataset, feed, API or file, free or paid.
- Sell Deal Data, or use it to train a model, build a competing deal or
  price-tracking service, or populate another deals site or channel.
- Replace detectadeal's affiliate links with your own (see above). This is
  the one line we will enforce: it is how the free service is paid for.
- Remove or hide the detectadeal credit, or imply detectadeal endorses your
  project.
- Circumvent rate limits, spoof the User-Agent, or use multiple IPs or
  accounts to exceed a human-paced request rate.

## Attribution format

Minimum credit, in text or as a link:

> Deals and price history by [detectadeal.com](https://www.detectadeal.com)

## Enforcement and changes

detectadeal may rate-limit, block or revoke API access for any use that
breaks these terms, and may update these terms by changing this file and the
site Terms of Service. Continued use after a change means you accept it.

Questions or a licence for commercial use: https://www.detectadeal.com/contact
