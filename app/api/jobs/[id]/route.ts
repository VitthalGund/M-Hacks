import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import mongoose from "mongoose";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    console.log(`[Job API] Request for ID: ${params.id}`);
    try {
        const session:any = await getServerSession(authOptions as any) as Session | null;
        await dbConnect();

        let job;
        if (mongoose.isValidObjectId(params.id)) {
            job = await Job.findById(params.id);
        } else {
            job = await Job.findOne({ job_id: params.id });
        }

        console.log(`[Job API] Job found: ${!!job}`);

        if (!job) {
            return NextResponse.json({ message: "Job not found" }, { status: 404 });
        }

        const isClient = session?.user?.id === job.clientId;
        const isFreelancer = session?.user?.role === "freelancer";

        let responseData = { ...job.toObject() };

        if (isClient) {
            // Client sees all bids
            responseData.bids = job.bids;
        } else {
            // Freelancers see anonymized stats
            if (job.bids && job.bids.length > 0) {
                const amounts = job.bids.map((b: any) => b.amount);
                responseData.bidStats = {
                    min: Math.min(...amounts),
                    max: Math.max(...amounts),
                    count: amounts.length,
                    myBid: isFreelancer ? job.bids.find((b: any) => b.freelancerId === session?.user?.id) : null
                };
            } else {
                responseData.bidStats = { min: 0, max: 0, count: 0, myBid: null };
            }
            // Remove raw bids for non-owners
            delete responseData.bids;
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
