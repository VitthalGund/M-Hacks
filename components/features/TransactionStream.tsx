"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowDownLeft, ArrowUpRight, Coffee, ShoppingBag, Home, Server, Loader2 } from "lucide-react";

type Transaction = {
  id: string;
  merchant: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  date: string;
  status: "pending" | "cleared";
};

export function TransactionStream({ lastUpdated }: { lastUpdated?: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [lastUpdated]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/bank/transactions");
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((t: any) => ({
          id: t.transaction_id,
          merchant: t.merchant_name || t.description,
          amount: t.amount,
          type: t.transaction_type === 'CREDIT' ? 'credit' : 'debit',
          category: t.transaction_category || 'General',
          date: new Date(t.date).toLocaleDateString(),
          status: "cleared"
        }));
        setTransactions(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Live Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {transactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No transactions yet</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {tx.category === 'Income' ? <ArrowDownLeft className="w-5 h-5" /> :
                   tx.category === 'Food' ? <Coffee className="w-5 h-5" /> :
                   tx.category === 'Housing' ? <Home className="w-5 h-5" /> :
                   tx.category === 'Software' ? <Server className="w-5 h-5" /> :
                   <ShoppingBag className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium truncate max-w-[150px]">{tx.merchant}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <span>{tx.category}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${tx.type === 'credit' ? 'text-green-400' : 'text-foreground'}`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                </p>
                {tx.status === 'pending' && <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4">Pending</Badge>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
