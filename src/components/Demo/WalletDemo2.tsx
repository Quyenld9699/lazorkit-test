"use client";
import { base64, bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { useWallet } from "@lazorkit/wallet";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, Transaction, Connection, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { Buffer } from "buffer";
// Ensure Buffer is available globally in the browser
if (typeof window !== "undefined" && !(window as any).Buffer) {
    (window as any).Buffer = Buffer;
}
import React, { useState, useMemo } from "react";
import { Button } from "../ui/button";

export default function WalletDemo2() {
    const {
        connect,
        isConnecting,
        isConnected,
        smartWalletPubkey,
        wallet,
        error,
        disconnect,
        isSmartWalletReady,
        getSmartWalletByPasskey,
        getCurrentSmartWallet,
        getSmartWalletStatus,
        signAndSendTransaction,
        connectPasskey,
    } = useWallet();
    // Fallback endpoint + connection (wallet hook doesn't expose connection)
    const [endpoint, setEndpoint] = useState<string>("https://api.devnet.solana.com");
    const fallbackConnection = useMemo(() => new Connection(endpoint, { commitment: "confirmed" }), [endpoint]);
    const [instructionJson, setInstructionJson] = useState<string>("");
    const [isSending, setIsSending] = useState<boolean>(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [errorCategory, setErrorCategory] = useState<string | null>(null);
    const [rpcLogs, setRpcLogs] = useState<string[] | null>(null);
    const [lastInstructionDebug, setLastInstructionDebug] = useState<any | null>(null);
    const [doSimulate, setDoSimulate] = useState<boolean>(true);
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

    // Categorize different error sources for clearer feedback
    const classifyError = (e: any): { category: string; message: string; logs?: string[] } => {
        if (!e) return { category: "UNKNOWN", message: "Unknown error" };
        // Wallet / signing library might wrap errors
        const msg = (e.message || e.toString?.() || "").toString();
        // Heuristic categories
        if (msg.includes("Unexpected token") || msg.includes("JSON")) return { category: "PARSE_JSON", message: msg };
        if (msg.includes("Unsupported data format") || msg.includes("Invalid base64") || msg.includes("Invalid hex")) return { category: "PARSE_DATA", message: msg };
        if (msg.includes("Signer must include") || msg.includes("System transfer") || msg.includes("Token Transfer")) return { category: "PREVALIDATION", message: msg };
        if (msg.includes("Transaction simulation failed")) {
            // web3.js simulation error often attaches logs at e.logs
            return { category: "SIMULATION", message: msg, logs: e.logs };
        }
        if (msg.includes("Blockhash") || msg.includes("signature verification failure")) return { category: "SIGNING", message: msg };
        if (msg.includes("Invalid transaction")) return { category: "RPC_REJECT", message: msg };
        // Generic network / RPC path
        if (msg.toLowerCase().includes("rpc")) return { category: "RPC", message: msg };
        return { category: "UNKNOWN", message: msg };
    };

    const simulateIx = async (ix: TransactionInstruction) => {
        if (!smartWalletPubkey) return { ok: false, logs: ["No wallet public key"] };
        try {
            const conn = fallbackConnection;
            const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
            // Build a v0 message (even single ix)
            const msg = new TransactionMessage({
                payerKey: smartWalletPubkey,
                recentBlockhash: blockhash,
                instructions: [ix],
            }).compileToV0Message();
            const vtx = new VersionedTransaction(msg);
            // No signatures required for simulation; config can disable sig verify
            const sim = await conn.simulateTransaction(vtx, { sigVerify: false });
            return { ok: !sim.value.err, logs: sim.value.logs || [], err: sim.value.err };
        } catch (e: any) {
            return { ok: false, logs: [e?.message || "Simulation threw"], err: e };
        }
    };

    const handleSendInstruction = async () => {
        if (!smartWalletPubkey) return;
        try {
            setLocalError(null);
            setErrorCategory(null);
            setRpcLogs(null);
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
                    setErrorCategory("PREVALIDATION");
                    return;
                }
                console.log("Instruction accounts:", ix.keys.length, "data bytes:", (ix.data as Buffer).length);
                // Extra decode for SystemProgram transfer
                let decoded: any = null;
                if (ix.programId.toBase58() === SYSTEM_PROGRAM_ID && (ix.data as Buffer).length === 12) {
                    const buf = ix.data as Buffer;
                    const idx = buf.readUInt32LE(0);
                    const lamports = Number(buf.readBigUInt64LE(4));
                    decoded = { index: idx, lamports };
                }
                setLastInstructionDebug({
                    programId: ix.programId.toBase58(),
                    keys: ix.keys.map((k) => ({ pubkey: k.pubkey.toBase58(), isSigner: k.isSigner, isWritable: k.isWritable })),
                    dataBase64: base64.encode(ix.data as Buffer),
                    decoded,
                });
                if (doSimulate) {
                    try {
                        const sim = await simulateIx(ix);
                        console.log("Simulation logs:", sim.logs);
                        if (!sim.ok) {
                            setErrorCategory("SIMULATION");
                            setLocalError(`Simulation failed: ${JSON.stringify(sim.err)}`);
                            setRpcLogs(sim.logs || []);
                            return; // abort send
                        } else if (sim.logs && sim.logs.length) {
                            setRpcLogs(sim.logs);
                        }
                    } catch (se) {
                        console.warn("Simulation exception", se);
                    }
                }
                const sig = await signAndSendTransaction(ix);
                console.log("Sent instruction:", sig);
            } else {
                const ix = toInstruction(parsed);
                const err = validateIfSystemTransfer(ix) || validateIfSplToken(ix) || validateHasWalletSigner(ix);
                if (err) {
                    setLocalError(err);
                    setErrorCategory("PREVALIDATION");
                    return;
                }
                console.log("Instruction accounts:", ix.keys.length, "data bytes:", (ix.data as Buffer).length);
                let decoded: any = null;
                if (ix.programId.toBase58() === SYSTEM_PROGRAM_ID && (ix.data as Buffer).length === 12) {
                    const buf = ix.data as Buffer;
                    const idx = buf.readUInt32LE(0);
                    const lamports = Number(buf.readBigUInt64LE(4));
                    decoded = { index: idx, lamports };
                }
                setLastInstructionDebug({
                    programId: ix.programId.toBase58(),
                    keys: ix.keys.map((k) => ({ pubkey: k.pubkey.toBase58(), isSigner: k.isSigner, isWritable: k.isWritable })),
                    dataBase64: base64.encode(ix.data as Buffer),
                    decoded,
                });
                if (doSimulate) {
                    try {
                        const sim = await simulateIx(ix);
                        console.log("Simulation logs:", sim.logs);
                        if (!sim.ok) {
                            setErrorCategory("SIMULATION");
                            setLocalError(`Simulation failed: ${JSON.stringify(sim.err)}`);
                            setRpcLogs(sim.logs || []);
                            return; // abort send
                        } else if (sim.logs && sim.logs.length) {
                            setRpcLogs(sim.logs);
                        }
                    } catch (se) {
                        console.warn("Simulation exception", se);
                    }
                }
                const sig = await signAndSendTransaction(ix);
                console.log("Sent instruction:", sig);
            }
        } catch (e) {
            console.error("Send failed:", e);
            const { category, message, logs } = classifyError(e);
            setErrorCategory(category);
            setLocalError(message);
            if (Array.isArray((e as any)?.logs)) setRpcLogs((e as any).logs);
            else if (Array.isArray(logs)) setRpcLogs(logs);
        } finally {
            setIsSending(false);
        }
    };

    async function connectPassk() {
        try {
            const data = await connectPasskey();
            console.log("data", data);
        } catch (error) {
            console.error("Error connect passkey:", error);
        }
    }

    async function testSmartWalletStatus() {
        try {
            const status = await getSmartWalletStatus();
            console.log("Smart wallet status:", status);
        } catch (error) {
            console.error("Error get smart wallet status:", error);
        }
    }

    async function checkIsSmartWalletReady() {
        try {
            const isReady = await isSmartWalletReady();
            console.log("Is smart wallet ready:", isReady);
        } catch (error) {
            console.error("Error check is smart wallet ready:", error);
        }
    }

    async function testGetCurrentSmartWallet() {
        try {
            const response = await getCurrentSmartWallet();
            console.log("Current smart wallet:", {
                smartWallet: response.smartWallet?.toString(),
                walletDevice: response.walletDevice?.toString(),
            });
        } catch (error) {
            console.error("Error get current smart wallet:", error);
        }
    }

    async function testConnect() {
        try {
            const res = await connect();
            console.log("Connect wallet success:", res);
        } catch (error) {
            console.error("Error connect wallet:", error);
        }
    }

    return (
        <div>
            <h2 style={{ fontSize: "30px", marginBottom: "30px" }}>LazorKit Wallet Demo 2</h2>

            <div>
                <Button variant={"secondary"} onClick={logs}>
                    Logs wallet
                </Button>
            </div>

            <div className="mt-2">
                <Button variant={"default"} onClick={connectPassk}>
                    Connect passkey
                </Button>
            </div>

            <div className="mt-2">
                <Button variant={"default"} onClick={testSmartWalletStatus}>
                    Test smart wallet status
                </Button>
            </div>
            <div className="mt-2">
                <Button variant={"default"} onClick={checkIsSmartWalletReady}>
                    Check isSmartWalletReady
                </Button>
            </div>
            <div className="mt-2">
                <Button variant={"default"} onClick={testGetCurrentSmartWallet}>
                    Get current smart wallet
                </Button>
            </div>
            <div className="mt-2">
                <p>Smart wallet: {smartWalletPubkey?.toString() || "null"}</p>
                <Button onClick={testConnect}>Test connect wallet (have create smartwallet)</Button>
            </div>

            <button onClick={() => console.log({ wallet, smartWalletPubkey, isConnected })}>Logs</button>

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

            {(error || localError) && (
                <div style={{ color: "red", marginTop: "20px" }}>
                    <p style={{ margin: 0 }}>Error: {localError ?? error?.message}</p>
                    {errorCategory && <p style={{ margin: 0 }}>Category: {errorCategory}</p>}
                    {rpcLogs && rpcLogs.length > 0 && (
                        <details style={{ marginTop: "8px" }} open>
                            <summary>RPC Logs ({rpcLogs.length})</summary>
                            <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>{rpcLogs.join("\n")}</pre>
                        </details>
                    )}
                </div>
            )}

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
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12 }}>RPC Endpoint (fallback for simulation)</label>
                    <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} style={{ padding: 4, fontFamily: "monospace", border: "1px solid #ccc", borderRadius: 4 }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={doSimulate} onChange={(e) => setDoSimulate(e.target.checked)} /> Simulate before send
                </label>
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
                {lastInstructionDebug && (
                    <details style={{ marginTop: "12px" }}>
                        <summary>Last Instruction Debug</summary>
                        <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>{JSON.stringify(lastInstructionDebug, null, 2)}</pre>
                    </details>
                )}
            </div>
        </div>
    );
}
