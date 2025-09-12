"use client";
import { useEffect, useState } from "react";

export default function CancelPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
    const [pid, setPid] = useState<string | null>(null);
    useEffect(() => {
        (async () => {
            const sp = searchParams;
            setPid(typeof sp.payment_id === "string" ? sp.payment_id : null);
        })();
    }, [searchParams]);

    return (
        <div className="max-w-md mx-auto py-10 grid gap-3">
            <h1 className="text-xl font-semibold text-yellow-700">Payment Canceled</h1>
            <div className="text-sm">
                {pid ? (
                    <>
                        Intent <code>{pid}</code> was canceled.
                    </>
                ) : (
                    "Canceled."
                )}
            </div>
            <a href="/pay" className="underline text-blue-700 mt-2">
                Back to pay
            </a>
        </div>
    );
}
