import { NextRequest, NextResponse } from "next/server";
import { createIntent } from "@/lib/mockStore";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const { amountFiat, currency, poolId, wallet, successUrl, cancelUrl } = body || {};
    if (typeof amountFiat !== "number" || !currency || !poolId) {
        return NextResponse.json({ error: "amountFiat, currency, poolId required" }, { status: 400 });
    }
    const usdtAmount = Number(body?.usdtAmount) || 0;
    const intent = createIntent({ amountFiat, currency, poolId, wallet, successUrl, cancelUrl, usdtAmount });
    return NextResponse.json(intent);
}
