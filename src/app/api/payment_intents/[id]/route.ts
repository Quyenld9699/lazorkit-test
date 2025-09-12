import { NextResponse } from "next/server";
import { getIntent } from "@/lib/mockStore";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const intent = getIntent(params.id);
    if (!intent) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(intent);
}
