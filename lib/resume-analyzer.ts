// Resume analyzer using pdfreader for PDFs and mammoth for DOCX
import mammoth from 'mammoth';
import { callGemini } from "@/lib/agents/ai-client";
const { PdfReader } = require('pdfreader');

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
        return new Promise((resolve, reject) => {
            const rows: any = {}; // indexed by y-coordinate
            let text = '';
            
            new PdfReader().parseBuffer(buffer, (err: any, item: any) => {
                if (err) {
                    reject(err);
                } else if (!item) {
                    // End of file - compile all text
                    const sortedRows = Object.keys(rows)
                        .sort((a, b) => parseFloat(a) - parseFloat(b))
                        .map(y => rows[y]);
                    
                    text = sortedRows.join('\n');
                    resolve(text);
                } else if (item.text) {
                    // Accumulate text items
                    const y = item.y;
                    if (!rows[y]) {
                        rows[y] = '';
                    }
                    rows[y] += item.text + ' ';
                }
            });
        });
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
    throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
}

export interface ResumeAnalysisResult {
    skills: string[];
    experienceYears: number;
    credibilityScore: number;
    summary: string;
}

export async function analyzeResumeWithGemini(text: string): Promise<ResumeAnalysisResult> {
    const prompt = `
    You are an expert HR and Technical Recruiter. Analyze the following resume text and extract key information.
    
    Resume Text:
    """
    ${text.slice(0, 10000)}
    """
    
    IMPORTANT INSTRUCTIONS FOR EXPERIENCE CALCULATION:
    1. Look for employment/work experience sections with date ranges
    2. Parse dates in formats like: "Jan 2020 - Present", "2018-2022", "March 2019 to Dec 2021", etc.
    3. Calculate the TOTAL years by:
       - Converting each date range to years (use current date for "Present"/"Current")
       - Summing all non-overlapping periods
       - Rounding to nearest whole number
    4. Example: "2018-2020" (2 years) + "2020-2023" (3 years) = 5 years total
    5. If no clear dates found, estimate based on job titles and descriptions (Junior/Entry=0-2, Mid=2-5, Senior=5+)
    
    Return a JSON object with the following fields:
    - "skills": Array of strings (list ALL technical and soft skills mentioned - programming languages, frameworks, tools, methodologies).
    - "experienceYears": Number (total years of professional work experience as calculated above).
    - "credibilityScore": Number (0-100, based on resume quality):
        * 90-100: Exceptional resume with detailed achievements, metrics, well-structured
        * 70-89: Good resume with clear experience and skills
        * 50-69: Average resume with basic information
        * 30-49: Poor resume lacking details
        * 0-29: Very sparse or poorly written resume
    - "summary": String (a brief 2-sentence professional summary highlighting key strengths).

    Ensure the output is valid JSON. Do not include markdown formatting like \`\`\`json.
    `;

    try {
        const response = await callGemini(prompt, 1200);
        const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);

        return {
            skills: Array.isArray(data.skills) ? data.skills : [],
            experienceYears: typeof data.experienceYears === 'number' ? Math.max(0, Math.round(data.experienceYears)) : 0,
            credibilityScore: typeof data.credibilityScore === 'number' ? Math.min(100, Math.max(0, data.credibilityScore)) : 50,
            summary: data.summary || "No summary available."
        };
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        // Fallback or rethrow
        return {
            skills: [],
            experienceYears: 0,
            credibilityScore: 40, // Default low score on error
            summary: "Could not analyze resume."
        };
    }
}
