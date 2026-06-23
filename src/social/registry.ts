import { InstagramProvider } from "./instagram-provider.js";
import { TikTokProvider } from "./tiktok-provider.js";
import type { ProviderName, SocialProvider } from "./types.js";

const providers = new Map<ProviderName, SocialProvider>();

function register(provider: SocialProvider): void {
	providers.set(provider.name, provider);
}

register(new InstagramProvider());
register(new TikTokProvider());

export function getProvider(name: string): SocialProvider {
	const key = name as ProviderName;
	const provider = providers.get(key);
	if (!provider) {
		throw new Error(
			`Unknown provider: '${name}'. Available: ${Array.from(providers.keys()).join(", ")}`,
		);
	}
	return provider;
}

export function getProviders(): SocialProvider[] {
	return Array.from(providers.values());
}
