import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Email notification features have been deprecated. Use the RFM analytics pipeline instead.",
    },
    { status: 410 }
  )
}
