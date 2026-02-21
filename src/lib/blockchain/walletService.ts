import { toast } from "sonner";

declare global {
    interface Window {
        ethereum?: any;
    }
}

class WalletService {
    async connect(): Promise<string | null> {
        if (typeof window.ethereum === "undefined") {
            toast.error("MetaMask or compatible wallet not found. Please install an extension.");
            return null;
        }

        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            if (accounts && accounts.length > 0) {
                toast.success("Wallet connected!");
                return accounts[0] as string;
            }
            return null;
        } catch (err: any) {
            if (err.code === 4001) {
                toast.error("Connection rejected by user.");
            } else {
                toast.error("Failed to connect wallet.");
            }
            console.error("Wallet connection error:", err);
            return null;
        }
    }

    async getAccount(): Promise<string | null> {
        if (typeof window.ethereum === "undefined") return null;
        try {
            const accounts = await window.ethereum.request({
                method: "eth_accounts"
            });
            return (accounts && accounts.length > 0) ? accounts[0] as string : null;
        } catch {
            return null;
        }
    }

    onAccountChange(callback: (account: string | null) => void) {
        if (typeof window.ethereum === "undefined") return;

        window.ethereum.on("accountsChanged", (accounts: any) => {
            const newAccount = accounts.length > 0 ? accounts[0] : null;
            callback(newAccount);
        });
    }
}

export const walletService = new WalletService();
