import { createClient } from "@/lib/supabase/server";

export const SCAN_BUCKET = "archive-scans";

export async function downloadScanObject(path: string) {
  const supabase = await createClient();
  return supabase.storage.from(SCAN_BUCKET).download(path);
}

export async function deleteScanObject(path: string) {
  const supabase = await createClient();
  return supabase.storage.from(SCAN_BUCKET).remove([path]);
}
