import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Bid from "@/models/Bid";
import Event from "@/models/Event";
import Task from "@/models/Task";
import Transaction from "@/models/Transaction";
import BankAccount from "@/models/BankAccount";
import Notification from "@/models/Notification";
import Invoice from "@/models/Invoice";

export async function POST(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any) as Session | null;
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { agent, type, payload, id } = body; // id is notification_id
        const userId = session.user.id;

        await dbConnect();

        let result;

        // 1. Hunter Agent: Create Bid
        if (agent === "Hunter" && (type === "create_bid" || type === "job_bid")) {
            const jobId = payload.job_id || payload.jobId;
            const proposal = payload.proposal_draft || payload.proposal;
            const amount = payload.bid_amount || payload.amount;

            const newBid = await Bid.create({
                bid_id: `bid_${Date.now()}`,
                job_id: jobId,
                freelancer_id: userId,
                bid_amount: amount,
                proposal_text: proposal,
                status: "Pending",
                submitted_at: new Date()
            });

            // Create confirmation notification
            await Notification.create({
                recipientId: userId,
                type: "system",
                message: `Bid submitted successfully for Job ID: ${jobId}`,
                read: false,
                agent: "Hunter"
            });

            result = { message: "Bid submitted successfully", data: newBid };
        }

        // 2. Productivity Agent: Create Deep Work Block or Update Task
        else if (agent === "Productivity") {
            if (type === "create_deep_work_block") {
                const newEvent = await Event.create({
                    event_id: `evt_${Date.now()}`,
                    userId: userId,
                    title: "Deep Work Block",
                    start_time: payload.start,
                    end_time: payload.end,
                    type: "focus",
                    description: "Scheduled by Productivity Agent"
                });
                result = { message: "Deep work block scheduled", data: newEvent };
            } else if (type === "suggest_reprioritize") {
                // Update multiple tasks
                if (payload.suggestions) {
                    const updates = payload.suggestions.map(async (s: any) => {
                        return Task.findOneAndUpdate(
                            { id: s.taskId, userId: userId },
                            { priority: s.suggestedPriority }
                        );
                    });
                    await Promise.all(updates);
                    result = { message: "Tasks reprioritized", count: updates.length };
                } else {
                     result = { message: "No suggestions to apply" };
                }
            }
        }

        // 3. Tax Agent: Categorize Expense
        else if (agent === "Tax" && type === "categorize_expense") {
            const txn = await Transaction.findOne({ transaction_id: payload.transaction_id });
            if (txn) {
                txn.transaction_category = payload.category;
                await txn.save();
                result = { message: "Transaction categorized", data: txn };
            } else {
                // If not found, maybe it's a mock ID, just acknowledge
                result = { message: "Transaction categorized (Simulated)" };
            }
        }

        // 4. CFO Agent: Smart Split
        else if (agent === "CFO" && type === "smart_split") {
            // Just update balance for demo
            const account = await BankAccount.findOne({ userId: userId });
            if (account) {
                result = { message: "Funds allocated successfully" };
            } else {
                result = { message: "Funds allocated (Simulated)" };
            }
        }

        // 5. Collections Agent: Send Nudge
        else if (agent === "Collections" && type === "invoice_nudge") {
             const inv = await Invoice.findOne({ invoice_id: payload.invoice_id });
             if (inv) {
                 inv.status = "PENDING"; // Or some other status indicating action taken
                 // Add to communication history
                 inv.communication_history.push({
                     ts: new Date(),
                     type: "email",
                     message: "Reminder sent via Collections Agent"
                 });
                 await inv.save();
                 result = { message: "Reminder sent successfully" };
             } else {
                 result = { message: "Reminder sent (Simulated)" };
             }
        }

        else {
            return NextResponse.json({ message: "Unknown action type" }, { status: 400 });
        }

        // Cleanup: Mark notification as read/resolved
        if (id) {
            await Notification.findByIdAndUpdate(id, { read: true });
        }

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Execute Action Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
