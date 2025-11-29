"use client";

import { CalendarEvent } from "@/lib/data-service";
import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export function SmartCalendar({ events = [] }: { events?: CalendarEvent[] }) {

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="glass-card p-6 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-accent" />
          Smart Calendar
        </h3>
        <span className="text-xs text-muted-foreground">Syncing...</span>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {events.map((event, index) => (
          <motion.div
            key={event.event_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-xl border transition-colors flex gap-4 ${
              event.priority === 'HIGH' 
                ? 'bg-accent/10 border-accent/30' 
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-white/10 pr-4">
              <span className="text-xs text-muted-foreground uppercase">{formatDate(event.start).split(' ')[0]}</span>
              <span className="text-lg font-bold">{formatDate(event.start).split(' ')[1]}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{event.title}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
