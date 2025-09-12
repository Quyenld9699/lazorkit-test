import { NextResponse } from "next/server";
import { quoteFiatToUsdt } from "@/lib/mockStore";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const { amount, currency } = body || {};
    if (typeof amount !== "number" || !currency) {
        return NextResponse.json({ error: "amount (number) and currency required" }, { status: 400 });
    }
    try {
        const usdt = quoteFiatToUsdt(amount, currency);
        return NextResponse.json({ usdt });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "quote failed" }, { status: 400 });
    }
}
