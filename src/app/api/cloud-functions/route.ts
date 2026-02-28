import { NextRequest, NextResponse } from "next/server";

const REGION = "us-central1";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.error("Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined in environment variables.");
}

/**
 * Server-side proxy for Firebase Cloud Functions.
 * Eliminates CORS issues by making the browser call same-origin (/api/functions)
 * and this route forwards to Cloud Functions server-to-server.
 *
 * Usage: POST /api/functions
 * Body: { "functionName": "createTeamMember", "data": { ... } }
 * Headers: Authorization: Bearer <idToken>
 */
export async function GET() {
  return NextResponse.json({ message: "Cloud Functions Proxy is reachable" });
}

export async function POST(req: NextRequest) {
  if (!PROJECT_ID) {
    return NextResponse.json(
      { error: { status: "INTERNAL", message: "Server misconfiguration: Missing Project ID" } },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { status: "INVALID_ARGUMENT", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const functionName = body?.functionName;
  if (!functionName || typeof functionName !== "string") {
    return NextResponse.json(
      { error: { status: "INVALID_ARGUMENT", message: "Missing functionName in body" } },
      { status: 400 }
    );
  }

  // Forward the auth header and the data payload to the Cloud Function
  const authHeader = req.headers.get("authorization") || "";
  const forwardBody = JSON.stringify({ data: body.data || {} });

  const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${functionName}`;
  console.log(`[Proxy] Attempting to call Cloud Function: ${url}`);

  try {
    const cfResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: forwardBody,
    });

    // If the Cloud Function itself is not found (404), return a helpful error
    if (cfResponse.status === 404) {
      console.error(`[Proxy] Cloud Function not found at: ${url}`);
      return NextResponse.json(
        { 
          error: { 
            status: "NOT_FOUND", 
            message: `Cloud Function "${functionName}" not found. Check if it is deployed, or if PROJECT_ID (${PROJECT_ID}) and REGION (${REGION}) are correct. URL: ${url}` 
          } 
        },
        { status: 404 }
      );
    }

    const responseData = await cfResponse.text();

    return new NextResponse(responseData, {
      status: cfResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Proxy error calling Cloud Function:", err);
    return NextResponse.json(
      { error: { status: "INTERNAL", message: "Failed to reach Cloud Function" } },
      { status: 502 }
    );
  }
}
