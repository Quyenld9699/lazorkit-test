export type Currency = "VND" | "USD" | "EUR";

export type PaymentStatus = "created" | "awaiting_payment" | "paid" | "settled" | "canceled";

export interface PaymentIntent {
    id: string;
    amountFiat: number;
    currency: Currency;
    usdtAmount: number;
    poolId: string;
    wallet?: string;
    status: PaymentStatus;
    successUrl?: string;
    cancelUrl?: string;
    txSig?: string;
    createdAt: number;
}

const intents = new Map<string, PaymentIntent>();

export const rates: Record<Currency, number> = {
    USD: 1,
    EUR: 1.1, // 1 USD ~ 0.91 EUR (rough), so 1 EUR ≈ 1.1 USDT for demo
    VND: 25000, // 1 USDT ≈ 25,000 VND (demo)
};

export function quoteFiatToUsdt(amount: number, currency: Currency): number {
    const perUsdt = rates[currency];
    if (!perUsdt) throw new Error("Unsupported currency");
    // amount (fiat) / fiatPerUSDT = usdtAmount
    const usdt = amount / perUsdt;
    return Math.max(0, Math.round(usdt * 1e6) / 1e6); // 6dp
}

export function createIntent(data: Omit<PaymentIntent, "id" | "status" | "createdAt">): PaymentIntent {
    const id = `pi_${Math.random().toString(36).slice(2, 10)}`;
    const intent: PaymentIntent = {
        id,
        ...data,
        status: "awaiting_payment",
        createdAt: Date.now(),
    };
    intents.set(id, intent);
    return intent;
}

export function getIntent(id: string): PaymentIntent | undefined {
    return intents.get(id);
}

export function updateIntent(id: string, patch: Partial<PaymentIntent>): PaymentIntent | undefined {
    const cur = intents.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch } as PaymentIntent;
    intents.set(id, next);
    return next;
}

export function cancelIntent(id: string): PaymentIntent | undefined {
    return updateIntent(id, { status: "canceled" });
}

export function markPaid(id: string): PaymentIntent | undefined {
    return updateIntent(id, { status: "paid" });
}

export function settleIntent(id: string): PaymentIntent | undefined {
    const txSig = `DEMO_${Math.random().toString(36).slice(2)}`;
    return updateIntent(id, { status: "settled", txSig });
}
