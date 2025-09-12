import { NextRequest, NextResponse } from "next/server";
import { B_getOrder } from "@/server/bGateway";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const order = await B_getOrder(id);
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(order);
}
