import { createReadStream } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "videos";

const supabase =
	SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
		? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
				auth: { persistSession: false },
			})
		: null;

export async function uploadVideo(
	jobId: string,
	filePath: string,
): Promise<string> {
	if (!supabase) {
		throw new Error(
			"Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
		);
	}

	const fileName = `${jobId}.mp4`;

	const { error } = await supabase.storage
		.from(STORAGE_BUCKET)
		.upload(fileName, createReadStream(filePath), {
			contentType: "video/mp4",
			upsert: true,
		});

	if (error) {
		throw new Error(`Failed to upload to Supabase: ${error.message}`);
	}

	const { data: publicUrl } = supabase.storage
		.from(STORAGE_BUCKET)
		.getPublicUrl(fileName);

	return publicUrl.publicUrl;
}
