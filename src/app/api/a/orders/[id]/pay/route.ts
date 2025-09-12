import { NextRequest, NextResponse } from "next/server";
import { B_devMarkPaid } from "@/server/bGateway";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const order = await B_devMarkPaid(id);
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(order);
}
