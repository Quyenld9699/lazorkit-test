"use client";
import { useWallet } from "@lazorkit/wallet";
import { SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

export default function WalletDemo() {
    const {
        // State
        smartWalletPubkey, // PublicKey | null - Smart wallet address
        isConnected, // boolean - Connection status (!!account)
        isLoading, // boolean - Loading state (isConnecting || isSigning)
        isConnecting, // boolean - Connection in progress
        isSigning, // boolean - Signing in progress
        error, // Error | null - Latest error if any
        // account, // WalletAccount | null - Wallet account data

        // Actions
        connect, // () => Promise<WalletAccount> - Connect wallet (auto-reconnect first)
        disconnect, // () => Promise<void> - Disconnect wallet (preserves communication)
        // signTransaction, // (instruction: TransactionInstruction) => Promise<string>
        signAndSendTransaction, // (instruction: TransactionInstruction) => Promise<string>

        // New methods for flexible workflows
        createPasskeyOnly, // () => Promise<ConnectResponse> - Create passkey only
        createSmartWalletOnly, // (passkeyData: ConnectResponse) => Promise<{smartWalletAddress: string, account: WalletAccount}>
        // reconnect, // () => Promise<WalletAccount> - Reconnect using stored credentials
    } = useWallet();

    // 1. Connect wallet (tries auto-reconnect first)
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
            const instruction = SystemProgram.transfer({
                fromPubkey: smartWalletPubkey,
                toPubkey: new PublicKey("7BeWr6tVa1pYgrEddekYTnQENU22bBw9H8HYJUkbrN71"),
                lamports: LAMPORTS_PER_SOL * 0.1,
            });

            const signature = await signAndSendTransaction(instruction);
            console.log("Transfer sent:", signature);
        } catch (error) {
            console.error("Transfer failed:", error);
        }
    };

    // 3. Disconnect (can reconnect later)
    const handleDisconnect = async () => {
        try {
            await disconnect();
            console.log("Disconnected successfully");
        } catch (error) {
            console.error("Disconnect failed:", error);
        }
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2 style={{ fontSize: "30px", marginBottom: "30px" }}>LazorKit Wallet Demo</h2>

            {!isConnected ? (
                <button style={{ padding: "10px 16px", background: "#03a9f4", borderRadius: "10px", color: "white", cursor: "pointer" }} onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <p>Wallet: {smartWalletPubkey?.toString().slice(0, 8)}...</p>

                    <button onClick={handleTransfer} disabled={isLoading}>
                        {isSigning ? "Sending..." : "Transfer SOL"}
                    </button>

                    <button onClick={handleDisconnect} style={{ backgroundColor: "#ff6b6b" }}>
                        Disconnect
                    </button>
                </div>
            )}

            {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
        </div>
    );
}
