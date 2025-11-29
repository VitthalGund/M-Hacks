"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";

export function SankeyDiagram({ lastUpdated }: { lastUpdated?: number }) {
  const [stats, setStats] = useState({ revenue: 0, taxSaved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/finance/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [lastUpdated]);

  if (loading) {
    return (
      <Card className="h-full bg-black/40 border-primary/20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // Derived values for visualization
  const income = stats.revenue;
  const tax = stats.taxSaved; // 20% estimated
  const savings = income * 0.2; // Mock 20% savings
  const spend = income - tax - savings;

  return (
    <Card className="h-full bg-black/40 border-primary/20">
      <CardHeader>
        <CardTitle>Smart Split Logic</CardTitle>
      </CardHeader>
      <CardContent className="relative h-[300px] flex items-center justify-center">
        {/* Simplified Visualization using CSS/Framer Motion instead of a heavy chart lib for prototype */}
        <div className="flex w-full justify-between items-center px-4">
          
          {/* Source */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center text-center p-2">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="font-bold text-green-400">₹{income.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Flows */}
          <div className="flex-1 h-32 flex flex-col justify-center relative mx-4">
             <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
               <motion.path 
                 d="M0,64 C50,64 50,20 100,20" 
                 fill="none" 
                 stroke="rgba(239, 68, 68, 0.3)" 
                 strokeWidth="20"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1 }}
                 transition={{ duration: 1.5 }}
               />
               <motion.path 
                 d="M0,64 C50,64 50,64 100,64" 
                 fill="none" 
                 stroke="rgba(59, 130, 246, 0.3)" 
                 strokeWidth="15"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1 }}
                 transition={{ duration: 1.5, delay: 0.2 }}
               />
               <motion.path 
                 d="M0,64 C50,64 50,108 100,108" 
                 fill="none" 
                 stroke="rgba(16, 185, 129, 0.3)" 
                 strokeWidth="30"
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1 }}
                 transition={{ duration: 1.5, delay: 0.4 }}
               />
             </svg>
          </div>

          {/* Destinations */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Tax (20%)</p>
                <p className="font-bold">₹{tax.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Savings (20%)</p>
                <p className="font-bold">₹{savings.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Spend (60%)</p>
                <p className="font-bold">₹{spend.toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
