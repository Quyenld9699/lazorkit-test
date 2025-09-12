import { NextResponse } from "next/server";
import { settleIntent, getIntent } from "@/lib/mockStore";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const cur = getIntent(params.id);
    if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
    const next = settleIntent(params.id);
    return NextResponse.json(next);
}
