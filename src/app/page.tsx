import WalletDemo2 from "@/components/Demo/WalletDemo2";
import LazorkitAppProvider from "@/components/LazorkitProvider/LazorkitProvider";

export default function Home() {
    return (
        <div className="font-sans  min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <LazorkitAppProvider>
                <WalletDemo2></WalletDemo2>
                <div className="mt-8">
                    <a className="underline" href="/pay">
                        Go to Payment Demo
                    </a>
                </div>
            </LazorkitAppProvider>
        </div>
    );
}
