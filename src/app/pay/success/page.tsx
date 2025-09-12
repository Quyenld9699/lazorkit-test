"use client";
import { useEffect, useState } from "react";

async function api(path: string) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function SuccessPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
    const [order, setOrder] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const sp = searchParams;
            const pid = typeof sp.payment_id === "string" ? sp.payment_id : null;
            if (!pid) return;
            try {
                const o = await api(`/api/a/orders/${pid}`);
                setOrder(o);
            } catch (e: any) {
                setErr(e?.message || "Failed to load order");
            }
        })();
    }, [searchParams]);

    return (
        <div className="max-w-md mx-auto py-10 grid gap-3">
            <h1 className="text-xl font-semibold text-green-700">Payment Successful</h1>
            {err && <div className="text-red-600 text-sm">{err}</div>}
            {!order ? (
                <div>Loading...</div>
            ) : (
                <div className="text-sm grid gap-1">
                    <div>
                        Intent: <code>{order.payment_id}</code>
                    </div>
                    <div>
                        Status: <b>{order.status}</b>
                    </div>
                    {order.tx_signature && (
                        <div>
                            Tx: <code>{order.tx_signature}</code>
                        </div>
                    )}
                    <a href="/pay" className="underline text-blue-700 mt-2">
                        Back to pay
                    </a>
                </div>
            )}
        </div>
    );
}
