import { NextRequest, NextResponse } from "next/server";
import { settleIntent, getIntent } from "@/lib/mockStore";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const cur = getIntent(id);
    if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
    const next = settleIntent(id);
    return NextResponse.json(next);
}
