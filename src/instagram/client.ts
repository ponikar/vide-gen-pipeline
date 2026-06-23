const BASE_URL = "https://graph.instagram.com/v22.0";

export class InstagramClient {
	private accessToken: string;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	async get<T>(path: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(`${BASE_URL}${path}`);
		url.searchParams.set("access_token", this.accessToken);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				url.searchParams.set(key, value);
			}
		}

		const res = await fetch(url.toString());
		if (!res.ok) {
			const body = await res.text();
			throw new InstagramApiError(res.status, body);
		}
		return res.json() as Promise<T>;
	}

	async post<T>(path: string, body: Record<string, string>): Promise<T> {
		const url = new URL(`${BASE_URL}${path}`);

		const formBody = new URLSearchParams();
		formBody.set("access_token", this.accessToken);
		for (const [key, value] of Object.entries(body)) {
			formBody.set(key, value);
		}

		const res = await fetch(url.toString(), {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: formBody,
		});

		if (!res.ok) {
			const body = await res.text();
			throw new InstagramApiError(res.status, body);
		}
		return res.json() as Promise<T>;
	}
}

export class InstagramApiError extends Error {
	constructor(
		public status: number,
		public body: string,
	) {
		super(`Instagram API error (${status}): ${body}`, { cause: body });
		this.name = "InstagramApiError";
	}
}
