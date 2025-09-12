"use client";
import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@lazorkit/wallet";

type Currency = "USD" | "EUR" | "VND";
const pools = [
    { id: "RAYDIUM_USDT-USDC", label: "Raydium USDT-USDC", apy: 8.2 },
    { id: "ORCA_USDT-SOL", label: "Orca USDT-SOL", apy: 12.1 },
    { id: "PYTH_USDT", label: "Pyth USDT Single", apy: 5.4 },
];

async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function PayPage() {
    const { connect, disconnect, isConnected, isConnecting, smartWalletPubkey } = useWallet();
    const [amount, setAmount] = useState<number>(0);
    const [currency, setCurrency] = useState<Currency>("VND");
    const [usdt, setUsdt] = useState<number>(0);
    const [pool, setPool] = useState<string>(pools[0].id);
    const [intentId, setIntentId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("idle");
    const [loading, setLoading] = useState<boolean>(false);
    const walletBase58 = smartWalletPubkey?.toBase58();

    useEffect(() => {
        let ignore = false;
        (async () => {
            if (amount > 0) {
                try {
                    const r = await api("/api/a/quote", { method: "POST", body: JSON.stringify({ amount, currency }) });
                    if (!ignore) setUsdt(r.usdt);
                } catch {}
            } else setUsdt(0);
        })();
        return () => {
            ignore = true;
        };
    }, [amount, currency]);

    const startPayment = async () => {
        if (!walletBase58) throw new Error("Connect wallet first");
        setLoading(true);
        try {
            const order = await api("/api/a/orders", {
                method: "POST",
                body: JSON.stringify({ amountFiat: amount, currency, poolId: pool, wallet: walletBase58, usdtAmount: usdt }),
            });
            const pid: string = order.payment_id;
            setIntentId(pid);
            setStatus("awaiting_payment");
            // DEV-ONLY: drive B state via A dev endpoints
            setTimeout(async () => {
                await api(`/api/a/orders/${pid}/pay`, { method: "POST" });
                setStatus("paid");
            }, 1200);
            setTimeout(async () => {
                const st = await api(`/api/a/orders/${pid}/settle`, { method: "POST" });
                setStatus(st.status);
            }, 3000);
        } catch (e: any) {
            alert(e?.message || "failed to create intent");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto grid gap-4">
            <h1 className="text-xl font-semibold">Deposit in Pool</h1>

            <div className="grid gap-2">
                <label className="text-sm">Enter amount</label>
                <div className="flex items-center gap-2">
                    <input type="number" min={0} step={0.01} className="flex-1 border rounded px-3 py-2" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                    <select className="border rounded px-2 py-2" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                        <option>VND</option>
                        <option>USD</option>
                        <option>EUR</option>
                    </select>
                </div>
                <p className="text-xs text-gray-500">≈ {usdt.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDT</p>
            </div>

            <div className="grid gap-2">
                <label className="text-sm">Pool</label>
                <select className="border rounded px-2 py-2" value={pool} onChange={(e) => setPool(e.target.value)}>
                    {pools.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label} · APY {p.apy}%
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2">
                {!isConnected ? (
                    <button onClick={() => connect()} disabled={isConnecting} className="px-4 py-2 rounded bg-black text-white">
                        {isConnecting ? "Connecting..." : "Connect Lazorkit Wallet"}
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-xs">
                            {walletBase58?.slice(0, 4)}...{walletBase58?.slice(-4)}
                        </span>
                        <button onClick={() => disconnect()} className="px-3 py-1 text-xs border rounded">
                            Disconnect
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                        setAmount(0);
                        setUsdt(0);
                        setIntentId(null);
                        setStatus("idle");
                    }}
                    className="px-4 py-2 rounded border"
                >
                    Cancel
                </button>
                <button onClick={startPayment} disabled={!isConnected || amount <= 0 || loading} className="px-4 py-2 rounded bg-lime-400">
                    {loading ? "Processing..." : "Subscribe"}
                </button>
            </div>

            {intentId && (
                <div className="mt-3 text-sm">
                    <div>
                        Intent: <code>{intentId}</code>
                    </div>
                    <div>
                        Status: <b>{status}</b>
                    </div>
                    {status === "settled" && <div className="text-green-600">Done. LP tokens are assumed deposited to your wallet (mock).</div>}
                </div>
            )}
        </div>
    );
}
