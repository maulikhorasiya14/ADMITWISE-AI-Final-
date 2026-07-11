import { NextResponse } from "next/server";
import { answerCounsellorQuestion } from "@/features/counsellor/counsellorService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await answerCounsellorQuestion(body);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.code,
          message: result.message
        }
      },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
