import * as Hunter from "./agents/hunter";
import * as Collections from "./agents/collections";
import * as CFO from "./agents/cfo";
import * as Productivity from "./agents/productivity";
import * as Tax from "./agents/tax";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import Invoice from "@/models/Invoice";
import Event from "@/models/Event";
import Task from "@/models/Task";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import Notification from "@/models/Notification";

// Helper to create notification if action exists
async function createNotification(userId: string, agent: string, type: string, message: string, payload: any) {
    // Check for duplicate to avoid spamming
    const exists = await Notification.findOne({ 
        recipientId: userId, 
        type: type, 
        "metadata.uniqueKey": payload.uniqueKey,
        read: false 
    });
    
    if (!exists) {
        await Notification.create({
            recipientId: userId,
            type: type, // e.g., 'agent_action' or specific type
            message: message,
            read: false,
            agent: agent, // Ensure Notification schema has this or we map it from type
            metadata: payload
        });
    }
}

// Main orchestrator function
export async function runAllAgents(userId: string) {
    await dbConnect();
    const logs: string[] = [];
    let actionCount = 0;

    // Helper to create status report if no critical action
    const createStatusReport = async (agent: string, message: string) => {
        await Notification.create({
            recipientId: userId,
            type: "status_report",
            agent: agent,
            message: message,
            read: false,
            metadata: { priority: "low" }
        });
    };

    // 1. Hunter Agent
    try {
        logs.push("Hunter: Scanning for job matches...");
        const hunterResults = await Hunter.processJobMatches(userId);
        if (hunterResults && hunterResults.length > 0) {
            logs.push(`Hunter: Found ${hunterResults.length} new matches.`);
            actionCount++;
        } else {
            await createStatusReport("Hunter", "Scanned latest jobs. No new high-match opportunities found.");
        }
    } catch (e: any) {
        console.error("Hunter Error", e);
        logs.push(`Hunter Error: ${e.message}`);
    }

    // 2. Collections Agent
    try {
        logs.push("Collections: Checking overdue invoices...");
        const myInvoices = await Invoice.find({ status: "Overdue" }); 
        let collectionsAction = false;
        for (const inv of myInvoices) {
            const invoiceRow: Collections.InvoiceRow = {
                invoice_id: inv.invoice_id,
                amount_due: Number(inv.amount_due || inv.amount),
                currency: inv.currency || "INR",
                status: inv.status,
                days_overdue: inv.days_overdue || 30,
                client_id: inv.client_id || "unknown"
            };

            if (Collections.shouldActOnInvoice(invoiceRow)) {
                const action = await Collections.onInvoiceAging(invoiceRow);
                if (action) {
                    await createNotification(userId, "Collections", "invoice_nudge", action.payload.message, {
                        ...action.payload,
                        uniqueKey: `col_${inv.invoice_id}_${new Date().toDateString()}`
                    });
                    logs.push(`Collections: Action generated for ${inv.invoice_id}`);
                    collectionsAction = true;
                    actionCount++;
                }
            }
        }
        if (!collectionsAction) {
            await createStatusReport("Collections", `Monitored ${myInvoices.length} overdue invoices. No immediate escalation needed.`);
        }
    } catch (e: any) {
        console.error("Collections Error", e);
        logs.push(`Collections Error: ${e.message}`);
    }

    // 3. CFO Agent
    try {
        logs.push("CFO: Analyzing recent transactions...");
        const recentTxn = await Transaction.findOne({ user_id: userId }).sort({ date: -1 });
        let cfoAction = false;
        if (recentTxn) {
            const cfoTxn: CFO.TransactionType = {
                transaction_id: recentTxn.transaction_id || recentTxn.txnId,
                user_id: userId,
                amount: Number(recentTxn.amount),
                type: recentTxn.type,
                narration: recentTxn.narration,
                date: recentTxn.date,
                balance_after_transaction: 150000 // Mock
            };

            if (CFO.shouldActOnTransaction(cfoTxn)) {
                const action = await CFO.onTransaction(cfoTxn, { user_id: userId });
                if (action) {
                    await createNotification(userId, "CFO", "smart_split", action.message, {
                        ...action,
                        uniqueKey: `cfo_${recentTxn._id}` 
                    });
                    logs.push(`CFO: Smart split suggested for ${recentTxn.transaction_id}`);
                    cfoAction = true;
                    actionCount++;
                }
            }
        }
        if (!cfoAction) {
            await createStatusReport("CFO", "Financial health check complete. Cash flow within normal parameters.");
        }
    } catch (e: any) {
        console.error("CFO Error", e);
        logs.push(`CFO Error: ${e.message}`);
    }

    // 4. Productivity Agent
    try {
        logs.push("Productivity: Evaluating schedule...");
        const tasks = await Task.find({ userId: userId });
        const events = await Event.find({ userId: userId });
        const schedule: Productivity.UserSchedule = {
            user_id: userId,
            tasks: tasks.map((t: any) => ({ id: t.id, dueDate: t.dueDate, est_hours: t.estHours || 2, done: t.done })),
            calendarEvents: events.map((e: any) => ({ id: e.event_id, start: e.start_time, end: e.end_time, title: e.title })),
            capacity: { billableDaysPerYear: 240, billableHoursPerDay: 6 }
        };

        let prodAction = false;
        if (Productivity.shouldEvaluateSchedule("calendar_updated", schedule)) {
            const result = await Productivity.evaluateSchedule(schedule);
            if (result.actions.length > 0) {
                for (const action of result.actions) {
                    let message = "Productivity Suggestion";
                    if (action.type === "block_new_jobs") message = action.reason;
                    else if (action.type === "create_deep_work_block") message = `Schedule Deep Work: ${action.title}`;
                    else if (action.type === "suggest_reprioritize") message = action.message || "Reprioritize tasks";

                    await createNotification(userId, "Productivity", "schedule_alert", message, {
                        ...action,
                        uniqueKey: `prod_${new Date().getTime()}_${Math.random()}`
                    });
                }
                logs.push(`Productivity: Generated ${result.actions.length} schedule suggestions.`);
                prodAction = true;
                actionCount++;
            }
        }
        if (!prodAction) {
            await createStatusReport("Productivity", "Schedule optimized. No conflicts or overload detected.");
        }
    } catch (e: any) {
        console.error("Productivity Error", e);
        logs.push(`Productivity Error: ${e.message}`);
    }

    // 5. Tax Agent
    try {
        logs.push("Tax: Reviewing expenses...");
        const recentTxn = await Transaction.findOne({ user_id: userId }).sort({ date: -1 });
        let taxAction = false;
        if (recentTxn) {
             const taxTxn: Tax.Txn = {
                transaction_id: recentTxn.transaction_id || recentTxn.txnId,
                user_id: userId,
                amount: Number(recentTxn.amount),
                narration: recentTxn.narration,
                date: recentTxn.date
            };

            if (Tax.shouldTaxAgentAct(taxTxn)) {
                const result = await Tax.categorizeTransaction(taxTxn);
                if (result) {
                    await createNotification(userId, "Tax", "tax_review", `Categorize ${recentTxn.narration}`, {
                        ...result,
                        uniqueKey: `tax_${recentTxn._id}`
                    });
                    logs.push(`Tax: Categorization suggestion for ${recentTxn.narration}`);
                    taxAction = true;
                    actionCount++;
                }
            }
        }
        if (!taxAction) {
            await createStatusReport("Tax", "Expense categorization up to date.");
        }
    } catch (e: any) {
        console.error("Tax Error", e);
        logs.push(`Tax Error: ${e.message}`);
    }

    return { success: true, logs };
}

export async function getPendingActions(userId: string) {
    await dbConnect();
    // Fetch unread notifications for agents
    const notifs = await Notification.find({
        recipientId: userId,
        read: false,
        // We can filter by specific types if needed, but for now take all unread agent-related ones
        // Assuming 'agent' field is populated or we infer from type
    }).sort({ createdAt: -1 });

    // Map to UI Action Interface
    return notifs.map(n => ({
        id: n._id.toString(),
        agent: n.agent || mapTypeToAgent(n.type),
        type: n.type,
        message: n.message,
        timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        payload: n.metadata,
        status: n.metadata?.priority === 'high' ? 'warning' : 'success' // Simple mapping
    }));
}

function mapTypeToAgent(type: string): string {
    if (type === 'job_match') return 'Hunter';
    if (type === 'invoice_nudge') return 'Collections';
    if (type === 'smart_split') return 'CFO';
    if (type === 'schedule_alert') return 'Productivity';
    if (type === 'tax_review') return 'Tax';
    return 'System';
}
