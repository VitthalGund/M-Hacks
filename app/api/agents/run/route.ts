import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { runAllAgents, getPendingActions } from "@/lib/agents-service";

export async function GET() {
    try {
        const session: any = await getServerSession(authOptions as any) as Session | null;
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Trigger Agent Scans
        const runResult = await runAllAgents(userId);

        // 2. Fetch Pending Actions (Notifications)
        const actions = await getPendingActions(userId);

        return NextResponse.json({
            success: true,
            count: actions.length,
            actions: actions,
            logs: runResult.logs
        });

    } catch (error: any) {
        console.error("Run Agents Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
