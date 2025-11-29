"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PlaneTakeoff } from "lucide-react";

export function RunwayCalculator({ daysLeft = 0 }: { daysLeft?: number }) {

  return (
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <PlaneTakeoff className="w-5 h-5 text-blue-500" />
          <CardTitle className="text-base">Runway</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-blue-400"
          >
            {daysLeft}
          </motion.span>
          <span className="text-muted-foreground">days</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Based on your 90-day average spend of ₹1,200/day.
        </p>
      </CardContent>
    </Card>
  );
}
