import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";

/**
 * Issues a short-lived token so an admin's browser can upload a PDF straight to private Blob storage
 * (no server size limit). The admin page then saves the file's address with attachReport().
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Only admins can upload reports." }, { status: 403 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user?.isAdmin) throw new Error("Only admins can upload reports.");
        if (!pathname.startsWith("reports/") || !pathname.toLowerCase().endsWith(".pdf")) throw new Error("Upload a PDF.");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
}
