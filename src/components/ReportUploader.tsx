"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { attachReport } from "@/app/admin/clients/[id]/actions";

export function ReportUploader({ userId, hasReport }: { userId: string; hasReport: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; pct: number; msg: string; err: boolean }>({ busy: false, pct: 0, msg: "", err: false });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setState({ busy: false, pct: 0, msg: "Choose a PDF file.", err: true });
      return;
    }
    setState({ busy: true, pct: 0, msg: "Uploading…", err: false });
    try {
      const safe = file.name.replace(/[^\w.\- ]+/g, "_");
      const blob = await upload(`reports/${userId}/${safe}`, file, {
        access: "private",
        handleUploadUrl: "/api/report/upload",
        contentType: "application/pdf",
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setState((s) => ({ ...s, pct: Math.round(percentage) })),
      });
      await attachReport(userId, blob.url, file.name, file.size);
      setState({ busy: false, pct: 100, msg: "Report uploaded.", err: false });
      router.refresh();
    } catch (err) {
      setState({ busy: false, pct: 0, msg: err instanceof Error ? err.message : "Upload failed. Try again.", err: true });
    }
  }

  return (
    <div className="uploader">
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={onPick} />
      <button type="button" className="btn primary" disabled={state.busy} onClick={() => input.current?.click()}>
        {state.busy ? `Uploading ${state.pct}%` : hasReport ? "Replace PDF" : "Upload designed PDF"}
      </button>
      {state.msg && <span className={`up-msg${state.err ? " err" : ""}`} role="status">{state.msg}</span>}
    </div>
  );
}
