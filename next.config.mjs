/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude AWS module from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude AWS module from ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Webpack configuration to exclude AWS module
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // External packages for server components
  serverExternalPackages: ['@aws-sdk/client-bedrock-runtime', '@aws-sdk/client-s3', '@aws-sdk/client-textract', '@aws-sdk/client-dynamodb'],
};

export default nextConfig;
