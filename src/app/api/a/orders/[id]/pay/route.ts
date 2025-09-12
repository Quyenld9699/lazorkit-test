import { NextResponse } from "next/server";
import { B_devMarkPaid } from "@/server/bGateway";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const order = await B_devMarkPaid(params.id);
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(order);
}
