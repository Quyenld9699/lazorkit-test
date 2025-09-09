"use client";
import { useWallet } from "@lazorkit/wallet";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import React, { useState } from "react";

export default function WalletDemo2() {
    const { connect, isConnecting, disconnect, isConnected, smartWalletPubkey, error, signAndSendTransaction } = useWallet();
    const [recipientAddress, setRecipientAddress] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [isSending, setIsSending] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleConnect = async () => {
        try {
            const account = await connect();
            console.log("Connected:", account.smartWallet);
        } catch (error) {
            console.error("Connection failed:", error);
        }
    };
    // 2. Sign and send transaction
    const handleTransfer = async () => {
        if (!smartWalletPubkey) return;

        try {
            setLocalError(null);
            // basic validations
            if (!recipientAddress) {
                setLocalError("Please enter a recipient address.");
                return;
            }
            let toPubkey: PublicKey;
            try {
                toPubkey = new PublicKey(recipientAddress);
            } catch (e) {
                setLocalError("Invalid recipient address.");
                return;
            }

            const sol = parseFloat(amount);
            if (isNaN(sol) || sol <= 0) {
                setLocalError("Enter a valid amount of SOL (> 0).");
                return;
            }
            const lamports = Math.round(sol * LAMPORTS_PER_SOL);
            if (lamports <= 0) {
                setLocalError("Calculated lamports is too small.");
                return;
            }

            setIsSending(true);

            const instruction = SystemProgram.transfer({
                fromPubkey: smartWalletPubkey,
                toPubkey,
                lamports,
            });

            const signature = await signAndSendTransaction(instruction);
            console.log("Transfer sent:", signature);
        } catch (error) {
            console.error("Transfer failed:", error);
            setLocalError(error instanceof Error ? error.message : "Transfer failed");
        } finally {
            setIsSending(false);
        }
    };
    return (
        <div>
            <h2 style={{ fontSize: "30px", marginBottom: "30px" }}>LazorKit Wallet Demo 2</h2>
            {!isConnected ? (
                <button
                    style={{ padding: "10px 16px", background: isConnecting ? "#9e9e9e" : "#03a9f4", borderRadius: "10px", color: "white", cursor: isConnecting ? "not-allowed" : "pointer" }}
                    onClick={handleConnect}
                    disabled={isConnecting}
                >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
            ) : (
                <div>
                    <p>Connected: {smartWalletPubkey?.toString()}</p>
                    <button style={{ padding: "10px 16px", background: "red", borderRadius: "10px", color: "white", cursor: "pointer" }} onClick={disconnect}>
                        Disconnect
                    </button>
                </div>
            )}

            {(error || localError) && <p style={{ color: "red", marginTop: "20px" }}>Error: {localError ?? error?.message}</p>}

            <div style={{ marginTop: "40px", display: "flex", alignItems: "center" }}>
                <input
                    type="text"
                    placeholder="Recipient Address"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    style={{ padding: "8px", width: "300px", marginRight: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
                <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Amount (SOL)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={0}
                    step={0.000000001}
                    style={{ padding: "8px", width: "150px", marginRight: "10px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
                <button
                    onClick={handleTransfer}
                    disabled={!isConnected || !recipientAddress || !amount || isSending}
                    style={{ padding: "10px 16px", background: isSending ? "#9e9e9e" : "#4caf50", borderRadius: "10px", color: "white", cursor: isSending ? "not-allowed" : "pointer" }}
                >
                    {isSending ? "Sending..." : "Send SOL"}
                </button>
            </div>
        </div>
    );
}
