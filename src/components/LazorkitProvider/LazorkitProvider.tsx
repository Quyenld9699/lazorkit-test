"use client";
import { LazorkitProvider } from "@lazorkit/wallet";
import React from "react";

export default function LazorkitAppProvider({ children }: { children: React.ReactNode }) {
    return (
        <LazorkitProvider rpcUrl={process.env.LAZORKIT_RPC_URL} portalUrl={process.env.LAZORKIT_PORTAL_URL} paymasterUrl={process.env.LAZORKIT_PAYMASTER_URL}>
            {children}
        </LazorkitProvider>
    );
}
