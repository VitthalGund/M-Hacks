import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import Invoice from "@/models/Invoice";

export async function GET() {
    try {
        const session: any = await getServerSession(authOptions as any) as Session | null;
        if (!session || !session.user || session.user.role !== "client") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = session.user.id;

        // 1. Active Jobs (Open or InProgress)
        const activeJobsCount = await Job.countDocuments({
            clientId: userId,
            status: { $in: ["Open", "InProgress"] }
        });

        // 2. Total Spent (Sum of PAID invoices)
        const totalSpentResult = await Invoice.aggregate([
            { $match: { client_id: userId, status: "PAID" } },
            { $group: { _id: null, total: { $sum: "$amount_due" } } }
        ]);
        const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;

        // 3. Unread Applications (Total bids on Open jobs)
        // We assume bids on Open jobs are "pending/unread" for this MVP
        const openJobs = await Job.find({ clientId: userId, status: "Open" });
        let unreadApplications = 0;
        openJobs.forEach((job: any) => {
            if (job.bids) {
                unreadApplications += job.bids.length;
            }
        });

        return NextResponse.json({
            activeJobs: activeJobsCount,
            totalSpent,
            unreadApplications
        });

    } catch (error) {
        console.error("Error fetching client stats:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
