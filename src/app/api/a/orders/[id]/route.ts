import { NextResponse } from "next/server";
import { B_getOrder } from "@/server/bGateway";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const order = await B_getOrder(params.id);
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(order);
}
