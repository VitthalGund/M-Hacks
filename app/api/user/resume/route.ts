import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { extractTextFromBuffer, analyzeResumeWithGemini } from "@/lib/resume-analyzer";
import { calculateCredibilityScore } from "@/lib/scoring-service";

export async function POST(req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).userId || (session.user as any).id;
        
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type;

        // 1. Parse Resume
        const text = await extractTextFromBuffer(buffer, mimeType);
        if (!text) {
            return NextResponse.json({ message: "Could not extract text from file" }, { status: 400 });
        }

        // 2. Analyze with Gemini
        const analysis = await analyzeResumeWithGemini(text);
        const { skills, experienceYears, credibilityScore } = analysis;

        // 3. Calculate Score using the centralized service
        // This ensures consistency with the requested formula: Base + Financial + Skills + Experience
        const { score } = await calculateCredibilityScore(userId, skills.length, experienceYears);

        // 4. Update User
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            {
                $set: {
                    skills: skills,
                    experienceYears: experienceYears,
                    credibilityScore: score,
                    resumeUploadedAt: new Date()
                }
            },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            score: score,
            skills: skills,
            experienceYears: experienceYears,
            message: "Resume processed and profile updated successfully"
        });

    } catch (error: any) {
        console.error("Resume upload error:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
