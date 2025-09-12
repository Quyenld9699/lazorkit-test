import { NextRequest, NextResponse } from "next/server";
import { B_createOrder } from "@/server/bGateway";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { amountFiat, currency, poolId, wallet, successUrl, cancelUrl, usdtAmount } = body || {};
    if (typeof amountFiat !== "number" || !currency || !poolId || !wallet) {
        return NextResponse.json({ error: "amountFiat, currency, poolId, wallet required" }, { status: 400 });
    }
    const order = await B_createOrder({ amountFiat, currency, poolId, beneficiaryWallet: wallet, successUrl, cancelUrl, usdtAmount });
    return NextResponse.json(order);
}
