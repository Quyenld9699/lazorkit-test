import { NextRequest, NextResponse } from "next/server";
import { getIntent } from "@/lib/mockStore";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const intent = getIntent(id);
    if (!intent) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(intent);
}
