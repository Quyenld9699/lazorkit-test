import { NextResponse } from "next/server";
import { B_getQuote } from "@/server/bGateway";

export async function POST(req: Request) {
    const { amount, currency } = await req.json();
    if (typeof amount !== "number" || !currency) return NextResponse.json({ error: "amount, currency required" }, { status: 400 });
    const q = await B_getQuote(amount, currency);
    return NextResponse.json(q);
}
