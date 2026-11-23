import { NextResponse } from "next/server";
import { getActiveCampaignAt, type CampaignCopy } from "@/lib/campaigns";
import { listCampaigns } from "@/lib/server/campaign-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only: resolves the currently active campaign (if any) for the
// requested locale. The banner fetches this on mount. An empty/erroring store
// degrades to `campaign: null` so the home page is never broken by a campaign
// problem.
//
// Every home page visit calls this, so successful answers are cached at the CDN
// for a minute (per locale, since the query string is part of the cache key):
// one function run per minute instead of one per visitor. A campaign launched,
// edited or ended in /admin/campaigns therefore shows up within about a minute.
// Errors are left uncached so a Redis hiccup isn't pinned for a minute.
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=60";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const records = await listCampaigns();
    const campaign = getActiveCampaignAt(new Date(), records);
    if (!campaign) {
      return NextResponse.json({ campaign: null }, { headers: { "Cache-Control": CDN_CACHE } });
    }
    const copy: CampaignCopy = campaign[locale];
    return NextResponse.json(
      {
        campaign: {
          id: campaign.id,
          href: campaign.href,
          copy,
        },
      },
      { headers: { "Cache-Control": CDN_CACHE } }
    );
  } catch (error) {
    console.error("Failed to resolve active campaign:", error);
    return NextResponse.json({ campaign: null }, { status: 503 });
  }
}
