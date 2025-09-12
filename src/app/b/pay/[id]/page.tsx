"use client";
import { useEffect, useState } from "react";

// Mock provider B hosted payment page

async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function BPayPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);
    const [id, setId] = useState<string | null>(null);
    const [successUrl, setSuccessUrl] = useState<string | null>(null);
    const [cancelUrl, setCancelUrl] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { id } = params;
            const sp = searchParams;
            setId(id);
            try {
                const o = await api(`/api/a/orders/${id}`);
                setOrder(o);
                setSuccessUrl((o && o.success_url) || (typeof sp.success_url === "string" ? sp.success_url : null));
                setCancelUrl((o && o.cancel_url) || (typeof sp.cancel_url === "string" ? sp.cancel_url : null));
            } catch (e: any) {
                setErr(e?.message || "Failed to load order");
            }
        })();
    }, [params, searchParams]);

    const pay = async () => {
        if (!id) return;
        setLoading(true);
        try {
            await api(`/api/a/orders/${id}/pay`, { method: "POST" });
            const o = await api(`/api/a/orders/${id}/settle`, { method: "POST" });
            const url = successUrl || "/pay/success";
            const target = new URL(url, window.location.origin);
            target.searchParams.set("payment_id", id);
            target.searchParams.set("status", o.status);
            if (o.tx_signature) target.searchParams.set("tx", o.tx_signature);
            window.location.href = target.toString();
        } catch (e: any) {
            setErr(e?.message || "Payment failed");
        } finally {
            setLoading(false);
        }
    };

    const cancel = async () => {
        if (!id) return;
        setLoading(true);
        try {
            await api(`/api/a/orders/${id}/cancel`, { method: "POST" });
            const url = cancelUrl || "/pay/cancel";
            const target = new URL(url, window.location.origin);
            target.searchParams.set("payment_id", id);
            target.searchParams.set("status", "canceled");
            window.location.href = target.toString();
        } catch (e: any) {
            setErr(e?.message || "Cancel failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto py-10 grid gap-4">
            <h1 className="text-xl font-semibold">Provider B · Checkout</h1>
            {err && <div className="text-red-600 text-sm">{err}</div>}
            {!order ? (
                <div>Loading...</div>
            ) : (
                <div className="grid gap-2 text-sm">
                    <div>
                        Order: <code>{order.payment_id}</code>
                    </div>
                    <div>
                        Amount: {order.amount_fiat} {order.currency} (≈ {order.usdt_amount} USDT)
                    </div>
                    <div>Pool: {order.pool_id}</div>
                    <div>
                        Beneficiary: {order.beneficiary_wallet?.slice(0, 4)}...{order.beneficiary_wallet?.slice(-4)}
                    </div>
                </div>
            )}

            <div className="flex gap-3 mt-2">
                <button onClick={cancel} disabled={loading} className="px-4 py-2 rounded border">
                    Cancel
                </button>
                <button onClick={pay} disabled={loading} className="px-4 py-2 rounded bg-black text-white">
                    {loading ? "Processing..." : "Pay"}
                </button>
            </div>

            {(successUrl || cancelUrl) && (
                <div className="text-xs text-gray-500">
                    Redirects configured • success: {successUrl || "(default)"} • cancel: {cancelUrl || "(default)"}
                </div>
            )}
        </div>
    );
}
