import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";

export async function GET() {
    try {
        const session: any = await getServerSession(authOptions as any) as Session | null;
        if (!session || !session.user || session.user.role !== "client") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = session.user.id;

        // Fetch all jobs for this client
        const jobs = await Job.find({ clientId: userId });

        // Extract all bids
        let allBids: any[] = [];
        jobs.forEach((job: any) => {
            if (job.bids && job.bids.length > 0) {
                const jobBids = job.bids.map((bid: any) => ({
                    ...bid.toObject(),
                    jobTitle: job.title,
                    jobId: job.job_id || job._id
                }));
                allBids = [...allBids, ...jobBids];
            }
        });

        // Sort by createdAt desc
        allBids.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(allBids.slice(0, 10)); // Return top 10

    } catch (error) {
        console.error("Error fetching client bids:", error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
