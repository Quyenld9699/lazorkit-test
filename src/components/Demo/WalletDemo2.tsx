"use client";
import { useWallet } from "@lazorkit/wallet";
import React from "react";

export default function WalletDemo2() {
    const { connect, disconnect, isConnected, smartWalletPubkey, error } = useWallet();

    return (
        <div>
            <h2 style={{ fontSize: "30px", marginBottom: "30px" }}>LazorKit Wallet Demo 2</h2>
            {!isConnected ? (
                <button style={{ padding: "10px 16px", background: "#03a9f4", borderRadius: "10px", color: "white", cursor: "pointer" }} onClick={connect}>
                    Connect Wallet
                </button>
            ) : (
                <div>
                    <p>Connected: {smartWalletPubkey?.toString()}</p>
                    <button style={{ padding: "10px 16px", background: "red", borderRadius: "10px", color: "white", cursor: "pointer" }} onClick={disconnect}>
                        Disconnect
                    </button>
                </div>
            )}

            {error && (
                <p style={{ color: "red", marginTop: "20px" }}>
                    Error: {error.message} | {error.stack}
                </p>
            )}
        </div>
    );
}
