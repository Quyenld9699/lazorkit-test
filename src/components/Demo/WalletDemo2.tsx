"use client";
import { base64, bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { useWallet } from "@lazorkit/wallet";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
// Ensure Buffer is available globally in the browser
if (typeof window !== "undefined" && !(window as any).Buffer) {
    (window as any).Buffer = Buffer;
}
import React, { useState } from "react";

export default function WalletDemo2() {
    const { connect, isConnecting, disconnect, isConnected, smartWalletPubkey, error, signAndSendTransaction } = useWallet();
    const [instructionJson, setInstructionJson] = useState<string>("");
    const [isSending, setIsSending] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

    const validateIfSystemTransfer = (ix: TransactionInstruction): string | null => {
        if (ix.programId.toBase58() !== SYSTEM_PROGRAM_ID) return null;
        // Require [from (signer+writable), to (writable)]
        if (ix.keys.length < 2) return "System transfer requires 2 keys: [from, to].";
        const from = ix.keys[0];
        const to = ix.keys[1];
        if (!from.isSigner || !from.isWritable) return "First key (from) must be signer and writable.";
        if (!to.isWritable) return "Second key (to) must be writable.";
        if (smartWalletPubkey && !from.pubkey.equals(smartWalletPubkey)) {
            return `First key must match your smart wallet: ${smartWalletPubkey.toBase58()}`;
        }
        const data = ix.data as Buffer;
        if (data.length !== 12) return "System transfer data must be 12 bytes (u32 index + u64 lamports).";
        const index = data.readUInt32LE(0);
        if (index !== 2) return "System transfer instruction index must be 2 (first 4 bytes LE).";
        return null;
    };

    const handleConnect = async () => {
        try {
            const account = await connect();
            console.log("Connected:", account.smartWallet);
        } catch (error) {
            console.error("Connection failed:", error);
        }
    };
    const validateHasWalletSigner = (ix: TransactionInstruction): string | null => {
        const signerKeys = ix.keys.filter((k) => k.isSigner).map((k) => k.pubkey.toBase58());
        if (signerKeys.length === 0) return null; // no signers required by this ix
        if (!smartWalletPubkey) return "Wallet not connected.";
        const has = signerKeys.includes(smartWalletPubkey.toBase58());
        return has ? null : `Signer must include your connected wallet (${smartWalletPubkey.toBase58()}).`;
    };

    const validateIfSplToken = (ix: TransactionInstruction): string | null => {
        if (ix.programId.toBase58() !== TOKEN_PROGRAM_ID) return null;
        const d = ix.data as Buffer;
        if (d.length < 1) return "Token instruction data is empty.";
        const idx = d.readUInt8(0);
        // Handle common Transfer (index = 3)
        if (idx === 3) {
            if (d.length !== 1 + 8) return "Token Transfer data must be 9 bytes (u8 index + u64 amount).";
            if (ix.keys.length < 3) return "Token Transfer requires 3 accounts: [source, destination, authority].";
            const [source, dest, auth] = ix.keys;
            if (!source.isWritable) return "Source token account must be writable.";
            if (!dest.isWritable) return "Destination token account must be writable.";
            if (!auth.isSigner) return "Authority must be a signer.";
        }
        return null;
    };
    // 2. Parse instruction JSON and send
    const parseDataToBytes = (data: unknown): Buffer => {
        if (data == null) return Buffer.alloc(0);
        if (Array.isArray(data)) return Buffer.from(Uint8Array.from(data as number[]));
        if (typeof data === "string") {
            const str = data as string;
            const hasPrefix = str.includes(":");
            const [prefixRaw, restRaw] = hasPrefix ? (str.split(":", 2) as [string, string]) : ["base64", str];
            const prefix = prefixRaw.toLowerCase();
            const rest = restRaw;
            if (prefix === "utf8") {
                return Buffer.from(rest, "utf8");
            }
            if (prefix === "hex") {
                const hex = rest.startsWith("0x") ? rest.slice(2) : rest;
                if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error("Invalid hex string");
                if (hex.length % 2 !== 0) throw new Error("Hex data length must be even");
                return Buffer.from(hex, "hex");
            }
            // default base64 (supports base64url by normalizing and padding)
            try {
                let b64 = rest.replace(/-/g, "+").replace(/_/g, "/");
                const pad = b64.length % 4;
                if (pad === 2) b64 += "==";
                else if (pad === 3) b64 += "=";
                else if (pad !== 0) throw new Error("Invalid base64 length");
                return Buffer.from(b64, "base64");
            } catch (e) {
                throw new Error("Invalid base64 data string");
            }
        }
        throw new Error("Unsupported data format; use array, base64:, hex:, or utf8:");
    };

    function logs() {
        const instruction = SystemProgram.transfer({
            fromPubkey: smartWalletPubkey!,
            toPubkey: new PublicKey("7BeWr6tVa1pYgrEddekYTnQENU22bBw9H8HYJUkbrN71"),
            lamports: LAMPORTS_PER_SOL * 0.1,
        });
        const serialized = {
            programId: instruction.programId.toBase58(),
            keys: instruction.keys.map((k) => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable,
            })),
            data: base64.encode(instruction.data),
        };

        console.log(JSON.stringify(serialized, null, 2));
    }
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
        // If no keys provided, include fee payer as a readonly signer for better compatibility
        if (keys.length === 0 && smartWalletPubkey) {
            keys.push({ pubkey: smartWalletPubkey, isSigner: true, isWritable: false });
        }
        const data = parseDataToBytes(obj.data);
        return new TransactionInstruction({ programId, keys, data });
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
                const err = validateIfSystemTransfer(ix) || validateIfSplToken(ix) || validateHasWalletSigner(ix);
                if (err) {
                    setLocalError(err);
                    return;
                }
                console.log("Instruction accounts:", ix.keys.length, "data bytes:", (ix.data as Buffer).length);
                const sig = await signAndSendTransaction(ix);
                console.log("Sent instruction:", sig);
            } else {
                const ix = toInstruction(parsed);
                const err = validateIfSystemTransfer(ix) || validateIfSplToken(ix) || validateHasWalletSigner(ix);
                if (err) {
                    setLocalError(err);
                    return;
                }
                console.log("Instruction accounts:", ix.keys.length, "data bytes:", (ix.data as Buffer).length);
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
                <button onClick={logs} style={{ backgroundColor: "yellow" }}>
                    logs
                </button>

                <textarea
                    placeholder='Example 1 (Memo):\n{"programId":"MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr","keys":[],"data":"utf8:Hello from LazorKit"}\n\nExample 2 (System transfer raw data, 0.1 SOL):\n{"programId":"11111111111111111111111111111111","keys":[{"pubkey":"<from>","isSigner":true,"isWritable":true},{"pubkey":"<to>","isSigner":false,"isWritable":true}],"data":"hex:0200000000e1f50500000000"}\n\nNotes:\n- data supports prefixes: utf8:, hex:, base64: (default base64 if no prefix).\n- When keys are omitted, your fee payer may be added as a readonly signer.'
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
