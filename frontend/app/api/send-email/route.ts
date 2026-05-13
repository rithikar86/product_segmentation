import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Email sending has been deprecated. This endpoint is no longer supported.",
    },
    { status: 410 }
  )
}
