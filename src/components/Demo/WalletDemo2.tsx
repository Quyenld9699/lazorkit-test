"use client";
import { useWallet } from "@lazorkit/wallet";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import React, { useState } from "react";

export default function WalletDemo2() {
    const { connect, isConnecting, disconnect, isConnected, smartWalletPubkey, error, signAndSendTransaction } = useWallet();
    const [instructionJson, setInstructionJson] = useState<string>("");
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
    // 2. Parse instruction JSON and send
    const parseDataToBytes = (data: unknown): Uint8Array => {
        if (data == null) return new Uint8Array();
        if (Array.isArray(data)) return Uint8Array.from(data as number[]);
        if (typeof data === "string") {
            const str = data as string;
            const hasPrefix = str.includes(":");
            const [prefixRaw, restRaw] = hasPrefix ? (str.split(":", 2) as [string, string]) : ["base64", str];
            const prefix = prefixRaw.toLowerCase();
            const rest = restRaw;
            if (prefix === "utf8") {
                return new TextEncoder().encode(rest);
            }
            if (prefix === "hex") {
                const hex = rest.startsWith("0x") ? rest.slice(2) : rest;
                if (hex.length % 2 !== 0) throw new Error("Hex data length must be even");
                const out = new Uint8Array(hex.length / 2);
                for (let i = 0; i < hex.length; i += 2) {
                    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
                }
                return out;
            }
            // default base64
            try {
                const binary = atob(rest);
                return Uint8Array.from(binary, (c) => c.charCodeAt(0));
            } catch (e) {
                throw new Error("Invalid base64 data string");
            }
        }
        throw new Error("Unsupported data format; use array, base64:, hex:, or utf8:");
    };

    const toInstruction = (obj: any): TransactionInstruction => {
        if (!obj || typeof obj !== "object") throw new Error("Instruction must be an object");
        const programIdStr = obj.programId as string;
        if (!programIdStr) throw new Error("Missing programId");
        const programId = new PublicKey(programIdStr);
        const keys = (obj.keys ?? []).map((k: any) => ({
            pubkey: new PublicKey(k.pubkey),
            isSigner: !!k.isSigner,
            isWritable: !!k.isWritable,
        }));
        const data = parseDataToBytes(obj.data);
        // Cast to Buffer to satisfy @solana/web3.js type expectations while providing Uint8Array at runtime
        return new TransactionInstruction({ programId, keys, data: data as unknown as Buffer });
    };

    const handleSendInstruction = async () => {
        if (!smartWalletPubkey) return;
        try {
            setLocalError(null);
            if (!instructionJson.trim()) {
                setLocalError("Please enter instruction JSON.");
                return;
            }

            setIsSending(true);
            const parsed = JSON.parse(instructionJson.trim());
            if (Array.isArray(parsed)) {
                if (parsed.length !== 1) {
                    throw new Error("This demo supports sending one instruction per transaction. Provide a single instruction object.");
                }
                const ix = toInstruction(parsed[0]);
                const sig = await signAndSendTransaction(ix);
                console.log("Sent instruction:", sig);
            } else {
                const ix = toInstruction(parsed);
                const sig = await signAndSendTransaction(ix);
                console.log("Sent instruction:", sig);
            }
        } catch (e) {
            console.error("Send failed:", e);
            setLocalError(e instanceof Error ? e.message : "Failed to send instruction(s)");
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

            <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: 700 }}>
                <textarea
                    placeholder='{"programId":"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr","keys":[],"data":"utf8:Hello from LazorKit"}\n\nNotes:\n- data supports prefixes: utf8:, hex:, base64: (default is base64 when no prefix).\n- one instruction per send.'
                    value={instructionJson}
                    onChange={(e) => setInstructionJson(e.target.value)}
                    rows={8}
                    style={{ padding: "8px", width: "100%", border: "1px solid #ccc", borderRadius: "4px", fontFamily: "monospace" }}
                />
                <button
                    onClick={handleSendInstruction}
                    disabled={!isConnected || !instructionJson.trim() || isSending}
                    style={{
                        padding: "10px 16px",
                        background: isSending ? "#9e9e9e" : "#4caf50",
                        borderRadius: "10px",
                        color: "white",
                        cursor: isSending ? "not-allowed" : "pointer",
                        alignSelf: "flex-start",
                    }}
                >
                    {isSending ? "Sending..." : "Send Instruction(s)"}
                </button>
            </div>
        </div>
    );
}
