import { getApiUrl } from "@/lib/query-client";
import { tokens } from "./auth-tokens";

// Upload a local image (file uri from expo-image-picker) → returns hosted URL.
// Uses global fetch (not expo/fetch) so FormData file parts work in RN.
export async function uploadImageAsync(uri: string): Promise<string> {
  const { access } = await tokens.get();
  const name = uri.split("/").pop() || "photo.jpg";
  const ext = (name.split(".").pop() || "jpg").toLowerCase();
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const form = new FormData();
  form.append("file", { uri, name, type } as any);
  const base = getApiUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` }, // no Content-Type → fetch sets multipart boundary
    body: form,
  });
  if (!res.ok) throw new Error("upload failed");
  const data = await res.json();
  return data.url as string;
}
