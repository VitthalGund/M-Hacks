"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { HeartPulse } from "lucide-react";

export function HealthBar({ healthScore = 0 }: { healthScore?: number }) {

  return (
    <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-green-500" />
            <CardTitle className="text-base">Financial Health</CardTitle>
          </div>
          <span className="text-2xl font-bold text-green-400">{healthScore}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${healthScore}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full relative"
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
          </motion.div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          You have enough liquidity to cover 3 months of expenses. Great job!
        </p>
      </CardContent>
    </Card>
  );
}
