import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: false,
	// Mark Remotion packages as external for server-side API routes
	serverExternalPackages: [
		"@remotion/bundler",
		"@remotion/renderer",
		"@remotion/cli",
		"esbuild",
		"webpack"
	],
	webpack: (config, { isServer }) => {
		if (isServer) {
			// Prevent bundling of Remotion packages on the server
			config.externals = config.externals || [];
			if (Array.isArray(config.externals)) {
				config.externals.push(
					"@remotion/bundler",
					"@remotion/renderer",
					"@remotion/cli"
				);
			}
		}
		return config;
	}
};

export default nextConfig;
