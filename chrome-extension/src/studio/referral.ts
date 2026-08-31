// [M-EXTENSION][STUDIO][REFERRAL][START_BLOCK]
// Referral monetization block: products from the passport (ecom_item /
// artist_merch) become affiliate links for 3 shops (Yandex Market, AliExpress,
// Admitad) plus a deterministic revenue forecast (NFR-7, offline). Pure functions.
// URL shapes mirror the real APIs (YaM /partner/link/create, Ali
// aliexpress.affiliate.link.generate, Admitad /deeplink/{w_id}/{c_id}/).
import type { Passport } from "../data/types";
import { collectMerchProducts, productIconFor, type MerchProduct } from "../content/merchOffer/detect";
import { hashSeed, mulberry32 } from "../content/authorTools/charts";

export type ReferralShop = "yandex_market" | "aliexpress" | "admitad";

export interface ShopMeta {
  label: string;
  icon: string;
  color: string;
  apiName: string;
  commissionMin: number;
  commissionMax: number;
}

export const SHOPS: Record<ReferralShop, ShopMeta> = {
  yandex_market: {
    label: "Яндекс Маркет",
    icon: "🏬",
    color: "#FF3333",
    apiName: "GET /partner/link/create",
    commissionMin: 3,
    commissionMax: 7,
  },
  aliexpress: {
    label: "AliExpress",
    icon: "🛍️",
    color: "#FF6A00",
    apiName: "aliexpress.affiliate.link.generate",
    commissionMin: 5,
    commissionMax: 9,
  },
  admitad: {
    label: "Admitad",
    icon: "🔗",
    color: "#5B8DEF",
    apiName: "GET /deeplink/{w_id}/{c_id}/",
    commissionMin: 4,
    commissionMax: 8,
  },
};

export const SHOP_ORDER: ReferralShop[] = ["yandex_market", "aliexpress", "admitad"];

export const RZ_CLID = "2311987";
export const RZ_PLACE_ID = "421789";
export const RZ_WID = "232236";
export const RZ_CID = "234433";
export const AVG_ORDER = 12000;
export const BASE_VIEWS = 1000;

export interface OfferForecast {
  views: number;
  ctr: number;
  conv: number;
  epc: number;
  revenue: number;
}

export interface ReferralLink {
  shop: ReferralShop;
  url: string;
  shortUrl: string;
  status: "ready";
  commissionPct: number;
  forecast: OfferForecast;
}

export interface ReferralOffer {
  id: string;
  product: MerchProduct;
  links: ReferralLink[];
  best: ReferralLink;
}

export interface ShopTotals {
  label: string;
  icon: string;
  color: string;
  count: number;
  revenue: number;
}

export interface ReferralTotals {
  revenue: number;
  links: number;
  avgCtr: number;
  avgCommission: number;
  perShop: Record<ReferralShop, ShopTotals>;
}

export interface ReferralBundle {
  offers: ReferralOffer[];
  totals: ReferralTotals;
  currency: "₽";
  avgOrder: number;
}

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

function seedHex(s: string): string {
  return hashSeed(s).toString(16).padStart(8, "0");
}

function shortUrlFor(shop: ReferralShop, seed: string): string {
  switch (shop) {
    case "yandex_market":
      return `https://ya.cc/rz-${seed}`;
    case "aliexpress":
      return `https://s.click.aliexpress.com/rz-${seed}`;
    case "admitad":
      return `https://ad.admitad.com/r/rz-${seed}`;
  }
}

export function forecastForOffer(
  query: string,
  videoId: string,
  commissionPct: number,
  confidence: number | null,
): OfferForecast {
  const rnd = mulberry32(hashSeed(`fc:${videoId}:${query}:${commissionPct}`));
  const ctr = round1(2.5 + rnd() * 4.5);
  const conv = round2(0.8 + rnd() * 2.4);
  const conf = Math.max(0.05, Math.min(1, confidence ?? 0.5));
  const views = Math.round(BASE_VIEWS * (0.5 + conf));
  const clicks = (views * ctr) / 100;
  const orders = (clicks * conv) / 100;
  const revenue = Math.round((orders * AVG_ORDER * commissionPct) / 100);
  const epc = clicks > 0 ? round1(revenue / clicks) : 0;
  return { views, ctr, conv, epc, revenue };
}

export function mockReferralUrl(
  shop: ReferralShop,
  query: string,
  videoId: string,
  idx: number,
  confidence: number | null,
): ReferralLink {
  const q = encodeURIComponent(query.trim());
  const sub = `${videoId}_p${idx}`;
  const seed = seedHex(`ref:${videoId}:${query}:${shop}`);
  const rnd = mulberry32(hashSeed(`com:${videoId}:${query}:${shop}`));
  const commissionPct = round1(
    SHOPS[shop].commissionMin + rnd() * (SHOPS[shop].commissionMax - SHOPS[shop].commissionMin),
  );

  let url: string;
  switch (shop) {
    case "yandex_market":
      url = `https://market.yandex.ru/search?text=${q}&clid=${RZ_CLID}&place_id=${RZ_PLACE_ID}&src=rz&vid=${sub}&pp=1000`;
      break;
    case "aliexpress":
      url = `https://aliexpress.ru/wholesale?SearchText=${q}&aff_platform=rz&aff_trace_key=${sub}&sk=${seed}`;
      break;
    case "admitad":
    default: {
      const ulp = encodeURIComponent(`https://market.yandex.ru/search?text=${q}&clid=${RZ_CLID}`);
      url = `https://ad.admitad.com/g/${seed}/${RZ_WID}/?subid=${sub}&ulp=${ulp}`;
      break;
    }
  }

  const shortUrl = shortUrlFor(shop, seed);
  const forecast = forecastForOffer(query, videoId, commissionPct, confidence);
  return { shop, url, shortUrl, status: "ready" as const, commissionPct, forecast };
}

function sourceProducts(passport: Passport): MerchProduct[] {
  const fromTimeline = collectMerchProducts(passport, 6);
  if (fromTimeline.length) return fromTimeline;
  return (passport.frontmatter.ad_targeting_keywords ?? [])
    .slice(0, 3)
    .map((kw) => ({
      label: kw,
      icon: productIconFor(kw),
      query: kw,
      type: "ecom_item",
      confidence: 0.4,
    }) as MerchProduct);
}

export function buildReferralBundle(passport: Passport, videoId: string): ReferralBundle {
  const products = sourceProducts(passport);
  const offers: ReferralOffer[] = products.map((p, idx) => {
    const links = SHOP_ORDER.map((shop) => mockReferralUrl(shop, p.query, videoId, idx, p.confidence));
    const best = links.reduce((a, b) => (a.forecast.revenue >= b.forecast.revenue ? a : b));
    return { id: `ref-${idx}-${seedHex(p.query)}`, product: p, links, best };
  });

  const perShop = {} as Record<ReferralShop, ShopTotals>;
  for (const shop of SHOP_ORDER) {
    const matching = offers.flatMap((o) => o.links.filter((l) => l.shop === shop));
    perShop[shop] = {
      label: SHOPS[shop].label,
      icon: SHOPS[shop].icon,
      color: SHOPS[shop].color,
      count: matching.length,
      revenue: matching.reduce((a, l) => a + l.forecast.revenue, 0),
    };
  }

  const bestLinks = offers.map((o) => o.best);
  const totals: ReferralTotals = {
    revenue: bestLinks.reduce((a, l) => a + l.forecast.revenue, 0),
    links: offers.reduce((a, o) => a + o.links.length, 0),
    avgCtr: bestLinks.length ? round1(bestLinks.reduce((a, l) => a + l.forecast.ctr, 0) / bestLinks.length) : 0,
    avgCommission: bestLinks.length
      ? round1(bestLinks.reduce((a, l) => a + l.commissionPct, 0) / bestLinks.length)
      : 0,
    perShop,
  };

  return { offers, totals, currency: "₽", avgOrder: AVG_ORDER };
}
// = [M-EXTENSION][STUDIO][REFERRAL][END_BLOCK]