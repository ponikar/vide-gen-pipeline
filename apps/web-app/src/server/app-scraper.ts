import { z } from "zod";
import type { ScrapedInfo } from "@/db/schema";

export const scrapedInfoSchema = z.object({
	name: z.string(),
	description: z.string(),
	tagline: z.string(),
	targetAudience: z.string(),
	problemSolved: z.string(),
	keyFeatures: z.array(z.string()),
	uniqueSellingPoints: z.array(z.string()),
	toneOfVoice: z.string(),
	keyBenefits: z.array(z.string()),
	useCases: z.array(z.string()),
});

type ScrapeLogger = {
	info: (event: string, data?: Record<string, unknown>) => void;
	error: (
		event: string,
		error: unknown,
		data?: Record<string, unknown>,
	) => void;
};

const appStoreLookupSchema = z.object({
	resultCount: z.number(),
	results: z.array(
		z
			.object({
				trackName: z.string(),
				description: z.string().optional(),
				primaryGenreName: z.string().optional(),
				genres: z.array(z.string()).optional(),
				sellerName: z.string().optional(),
				artistName: z.string().optional(),
			})
			.passthrough(),
	),
});

const FETCH_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
	Accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
	"Accept-Language": "en-US,en;q=0.9",
};

function preview(value: string, max = 160) {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function stripHtml(html: string) {
	return html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 8000);
}

function decodeHtml(value: string) {
	const namedEntities: Record<string, string> = {
		amp: "&",
		lt: "<",
		gt: ">",
		quot: '"',
		apos: "'",
		nbsp: " ",
	};

	return value
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number(code)),
		)
		.replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		)
		.replace(/&([a-z]+);/gi, (match, entity: string) => {
			return namedEntities[entity.toLowerCase()] ?? match;
		})
		.trim();
}

function cleanText(value: string) {
	return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number) {
	const text = cleanText(value);
	return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function sentencesFromText(text: string) {
	const cleaned = cleanText(text);
	return cleaned
		.split(/(?<=[.!?])\s+|\n+/)
		.map((sentence) => sentence.trim())
		.filter((sentence) => sentence.length >= 12)
		.map((sentence) => truncate(sentence, 180));
}

function unique(values: string[]) {
	const seen = new Set<string>();
	return values.filter((value) => {
		const key = value.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function takeOrFallback(values: string[], fallback: string, max: number) {
	const cleaned = unique(values.map((value) => truncate(value, 120)).filter(Boolean));
	return cleaned.length > 0 ? cleaned.slice(0, max) : [truncate(fallback, 120)];
}

function findMetaContent(html: string, names: string[]) {
	const desired = new Set(names.map((name) => name.toLowerCase()));
	const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

	for (const tag of metaTags) {
		const attrs = new Map<string, string>();
		const attrPattern = /([a-zA-Z_:.-]+)\s*=\s*(["'])(.*?)\2/g;
		let attrMatch = attrPattern.exec(tag);
		while (attrMatch) {
			attrs.set(attrMatch[1].toLowerCase(), attrMatch[3]);
			attrMatch = attrPattern.exec(tag);
		}

		const key = attrs.get("name") ?? attrs.get("property");
		const content = attrs.get("content");
		if (key && content && desired.has(key.toLowerCase())) {
			return cleanText(content);
		}
	}

	return "";
}

function findTitle(html: string) {
	const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return match ? cleanText(match[1]) : "";
}

function titleToName(title: string) {
	return title
		.split(/\s[|\u2013-]\s/)
		.map((part) => part.trim())
		.find(Boolean) ?? title;
}

function buildInfo(input: {
	name: string;
	description: string;
	tagline?: string;
	category?: string;
	bodyText: string;
}) {
	const name = truncate(input.name || "Untitled app", 100);
	const bodySentences = sentencesFromText(input.bodyText);
	const description = truncate(
		input.description || bodySentences[0] || `${name} is an app.`,
		200,
	);
	const tagline = truncate(input.tagline || bodySentences[0] || description, 100);
	const category = input.category ? cleanText(input.category).toLowerCase() : "";
	const featureCandidates = bodySentences.filter((sentence) => {
		return !sentence.toLowerCase().startsWith(name.toLowerCase());
	});

	return scrapedInfoSchema.parse({
		name,
		description,
		tagline,
		targetAudience: category
			? `People looking for ${category} apps`
			: `People interested in ${name}`,
		problemSolved: truncate(bodySentences[1] || description, 180),
		keyFeatures: takeOrFallback(featureCandidates, description, 6),
		uniqueSellingPoints: takeOrFallback(featureCandidates.slice(1), tagline, 4),
		toneOfVoice: "clear and practical",
		keyBenefits: takeOrFallback(featureCandidates.slice(2), description, 5),
		useCases: takeOrFallback(featureCandidates.slice(3), description, 4),
	}) satisfies ScrapedInfo;
}

function appStoreIdFromUrl(url: URL) {
	const pathId = url.pathname.match(/\/id(\d+)/)?.[1];
	return pathId ?? url.searchParams.get("id");
}

function appStoreCountryFromUrl(url: URL) {
	const firstPathPart = url.pathname.split("/").filter(Boolean)[0];
	return firstPathPart && /^[a-z]{2}$/i.test(firstPathPart)
		? firstPathPart.toLowerCase()
		: "us";
}

async function scrapeAppStoreInfo(url: URL, logger?: ScrapeLogger) {
	const id = appStoreIdFromUrl(url);
	if (!id) {
		throw new Error("App Store URL does not contain an app id");
	}

	const country = appStoreCountryFromUrl(url);
	const lookupUrl = new URL("https://itunes.apple.com/lookup");
	lookupUrl.searchParams.set("id", id);
	lookupUrl.searchParams.set("country", country);

	const response = await fetch(lookupUrl, { headers: FETCH_HEADERS });
	const raw = await response.text();
	logger?.info("scrape.appStore.lookup.done", {
		url: url.toString(),
		lookupUrl: lookupUrl.toString(),
		ok: response.ok,
		status: response.status,
		bodyLength: raw.length,
	});

	if (!response.ok) {
		throw new Error(`App Store lookup returned ${response.status}`);
	}

	const parsed = appStoreLookupSchema.safeParse(JSON.parse(raw) as unknown);
	if (!parsed.success || parsed.data.resultCount < 1) {
		throw new Error("App Store lookup did not return app details");
	}

	const app = parsed.data.results[0];
	const genres = app.genres ?? [];
	const category = app.primaryGenreName ?? genres[0] ?? "";
	const description = app.description ?? "";

	const info = buildInfo({
		name: app.trackName,
		description,
		tagline: sentencesFromText(description)[0],
		category,
		bodyText: [description, genres.join(". "), app.sellerName, app.artistName]
			.filter(Boolean)
			.join("\n"),
	});

	logger?.info("scrape.extract.done", {
		url: url.toString(),
		source: "app-store-lookup",
		name: info.name,
		descriptionPreview: preview(info.description),
	});

	return info;
}

async function scrapeWebsiteInfo(url: URL, logger?: ScrapeLogger) {
	const response = await fetch(url, { headers: FETCH_HEADERS });
	const html = await response.text();
	logger?.info("scrape.fetch.done", {
		url: url.toString(),
		ok: response.ok,
		status: response.status,
		contentType: response.headers.get("content-type"),
		htmlLength: html.length,
	});

	if (!response.ok) {
		throw new Error(`Website returned ${response.status}`);
	}

	const title = findMetaContent(html, ["og:title", "twitter:title"]) || findTitle(html);
	const description = findMetaContent(html, [
		"description",
		"og:description",
		"twitter:description",
	]);
	const siteName = findMetaContent(html, ["og:site_name", "application-name"]);
	const text = stripHtml(html);
	logger?.info("scrape.text.done", {
		url: url.toString(),
		textLength: text.length,
		textPreview: preview(text),
	});

	if (!text && !description && !title) {
		throw new Error("Website did not contain readable text");
	}

	const info = buildInfo({
		name: siteName || titleToName(title),
		description,
		tagline: description,
		bodyText: [description, title, text].filter(Boolean).join("\n"),
	});

	logger?.info("scrape.extract.done", {
		url: url.toString(),
		source: "html-metadata",
		name: info.name,
		descriptionPreview: preview(info.description),
	});

	return info;
}

export async function scrapeAppInfo(
	url: string,
	logger?: ScrapeLogger,
): Promise<ScrapedInfo> {
	logger?.info("scrape.start", { url });

	const parsedUrl = new URL(url);
	const host = parsedUrl.hostname.toLowerCase();
	if (host === "apps.apple.com" || host === "itunes.apple.com") {
		return scrapeAppStoreInfo(parsedUrl, logger);
	}

	return scrapeWebsiteInfo(parsedUrl, logger);
}
