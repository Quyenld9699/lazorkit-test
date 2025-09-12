// Service layer for calling provider B (payment gateway)
// For now, this mocks B using our in-memory store, so A's API routes only
// call these functions. Later, replace internals with real HTTP requests to B.

import { Currency, PaymentIntent, PaymentStatus, createIntent, getIntent, quoteFiatToUsdt, markPaid, settleIntent } from "@/lib/mockStore";

export type CreateOrderInput = {
    amountFiat: number;
    currency: Currency;
    poolId: string;
    beneficiaryWallet: string;
    successUrl?: string;
    cancelUrl?: string;
    usdtAmount?: number;
};

export type Order = {
    payment_id: string;
    status: PaymentStatus;
    amount_fiat: number;
    currency: Currency;
    usdt_amount: number;
    pool_id: string;
    beneficiary_wallet: string;
    tx_signature?: string;
};

export async function B_getQuote(amount: number, currency: Currency) {
    const usdt = quoteFiatToUsdt(amount, currency);
    return { usdt };
}

export async function B_createOrder(input: CreateOrderInput): Promise<Order> {
    // MOCK: create intent locally as if B created an order and returned IDs
    const intent = createIntent({
        amountFiat: input.amountFiat,
        currency: input.currency,
        poolId: input.poolId,
        wallet: input.beneficiaryWallet,
        usdtAmount: input.usdtAmount || 0,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
    });
    return mapIntentToOrder(intent);
}

export async function B_getOrder(paymentId: string): Promise<Order | null> {
    const i = getIntent(paymentId);
    return i ? mapIntentToOrder(i) : null;
}

// The following two helpers are DEV-ONLY to simulate B advancing states
export async function B_devMarkPaid(paymentId: string): Promise<Order | null> {
    const i = markPaid(paymentId);
    return i ? mapIntentToOrder(i) : null;
}

export async function B_devSettle(paymentId: string): Promise<Order | null> {
    const i = settleIntent(paymentId);
    return i ? mapIntentToOrder(i) : null;
}

function mapIntentToOrder(i: PaymentIntent): Order {
    return {
        payment_id: i.id,
        status: i.status,
        amount_fiat: i.amountFiat,
        currency: i.currency,
        usdt_amount: i.usdtAmount,
        pool_id: i.poolId,
        beneficiary_wallet: i.wallet || "",
        tx_signature: i.txSig,
    };
}
