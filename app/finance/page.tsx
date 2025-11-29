"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TransactionStream } from "@/components/features/TransactionStream";
import { SankeyDiagram } from "@/components/features/SankeyDiagram";
import { ConnectBankModal } from "@/components/features/ConnectBankModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Wallet, PieChart, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [bankData, setBankData] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchBankData = async () => {
    try {
      const res = await fetch("/api/bank/balance");
      if (res.ok) {
        const data = await res.json();
        setBankData(data);
      }
    } catch (error) {
      console.error("Failed to fetch bank data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, []);

  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const handleSync = async () => {
    setSimulating(true);
    try {
      // Randomly decide number of transactions (1-3)
      const count = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < count; i++) {
        // Randomly decide type: CREDIT (Income) or DEBIT (Expense)
        const type = Math.random() > 0.5 ? 'CREDIT' : 'DEBIT';
        const amount = Math.floor(Math.random() * (type === 'CREDIT' ? 5000 : 2000)) + 500;
        const description = type === 'CREDIT' 
          ? `Client Payment #${Math.floor(Math.random() * 1000)}` 
          : `Software Subscription #${Math.floor(Math.random() * 1000)}`;

        await fetch("/api/bank/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            amount,
            description,
            category: type === 'CREDIT' ? "Income" : "Software"
          })
        });
      }

      await fetchBankData(); // Refresh balance
      setLastUpdated(Date.now()); // Trigger graph update
      // Force refresh transaction stream (a bit hacky, but works for demo if we key it or use context)
      // window.location.reload(); // Removed reload, relying on state
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Financial Hub</h1>
            <p className="text-muted-foreground">CFO Agent is managing your cashflow and tax liabilities.</p>
          </div>
          {!bankData?.linked ? (
            <ConnectBankModal onSuccess={fetchBankData} />
          ) : (
            <div className="flex gap-2">
               <Button 
                onClick={handleSync}
                disabled={simulating}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
                {simulating ? "Syncing..." : "Sync"}
              </Button>
            </div>
          )}
        </header>

        {!bankData?.linked ? (
           <Card className="bg-slate-900/50 border-dashed border-2 border-slate-700 p-12 text-center">
             <div className="flex flex-col items-center gap-4">
               <div className="p-4 bg-slate-800 rounded-full">
                 <Wallet className="w-8 h-8 text-slate-400" />
               </div>
               <h3 className="text-xl font-semibold">No Bank Account Linked</h3>
               <p className="text-muted-foreground max-w-md">
                 Connect your primary bank account to enable real-time cashflow tracking, automated tax planning, and expense categorization.
               </p>
               <ConnectBankModal onSuccess={fetchBankData} />
             </div>
           </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Total Liquid Funds</span>
                    <Wallet className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold text-green-400">
                    ₹{bankData.balance.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{bankData.bankName} • Connected</p>
                </CardContent>
              </Card>
              
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Tax Liability (Est.)</span>
                    <PieChart className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="text-3xl font-bold text-red-400">₹{(bankData.balance * 0.3).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                  <p className="text-xs text-muted-foreground mt-1">Locked in Tax Vault.</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border-blue-500/20">
                 <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Monthly Burn</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-blue-400">₹35,000</div>
                  <p className="text-xs text-muted-foreground mt-1">Below budget by 12%.</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
              <TransactionStream lastUpdated={lastUpdated} />
              <div className="flex flex-col gap-8 h-full">
                <SankeyDiagram lastUpdated={lastUpdated} />
                <Card className="flex-1 bg-yellow-500/5 border-yellow-500/20">
                   <CardContent className="p-6">
                     <h3 className="font-bold mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-yellow-500" />
                       Deduction Hunter
                     </h3>
                     <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                       <p className="text-sm mb-3">
                         I noticed a bill from <span className="font-bold text-white">FabHotels</span> for ₹4,500. Was this a client visit?
                       </p>
                       <div className="flex gap-3">
                         <button className="px-4 py-1.5 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors">Yes, Claim it</button>
                         <button className="px-4 py-1.5 bg-white/10 text-muted-foreground rounded text-sm hover:bg-white/20 transition-colors">No, Personal</button>
                       </div>
                     </div>
                   </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
