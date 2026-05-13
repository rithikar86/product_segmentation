/** @type {import('next').NextConfig} */

/**
 * VoltStream Next.js Configuration
 * 
 * This configuration is for the /frontend folder.
 * The Python backend runs separately on port 5000.
 */

const nextConfig = {
  // ==========================================
  // API CONFIGURATION
  // ==========================================

  /**
   * Environment Variables
   * Make the backend URL available to the browser
   * These MUST be prefixed with NEXT_PUBLIC_ to be accessible in the browser
   */
  env: {
    // Backend API endpoint
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',

    // Email service endpoint
    NEXT_PUBLIC_EMAIL_API: process.env.NEXT_PUBLIC_EMAIL_API || '/api/notify',
  },

  // ==========================================
  // REWRITES (Optional API Proxy)
  // ==========================================

  /**
   * Rewrites allow frontend API calls to be proxied to the backend
   * This helps avoid CORS issues in some scenarios
   * 
   * Usage in components:
   *   fetch('/api/backend/send-email', ...) 
   *   gets rewritten to:
   *   fetch('http://localhost:5000/api/send-email', ...)
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/backend/:path*',
          destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/:path*`,
        },
      ],
    }
  },

  // ==========================================
  // HEADERS (CORS Support)
  // ==========================================

  /**
   * Headers for development
   * In production, CORS should be handled by the backend or API gateway
   */
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version' },
        ],
      },
    ]
  },

  // ==========================================
  // REDIRECT MAPPING
  // ==========================================

  /**
   * Optional: Redirect old routes to new ones
   * Remove if not needed
   */
  async redirects() {
    return [
      // Example: redirect /dashboard to /segmentation
      // {
      //   source: '/dashboard',
      //   destination: '/segmentation',
      //   permanent: false,
      // },
    ]
  },

  // ==========================================
  // EXPERIMENTAL FEATURES
  // ==========================================

  experimental: {
    /**
     * Use serverActions for better API route handling
     * Keep enabled for Next.js 13+
     */
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:5000'],
    },
  },

  // ==========================================
  // WEBPACK CONFIGURATION
  // ==========================================

  /**
   * Custom webpack config if needed
   * Add any special loaders or plugins here
   */
  webpack: (config, { isServer }) => {
    // Optional: Add custom webpack config
    return config
  },

  // ==========================================
  // IMAGE OPTIMIZATION
  // ==========================================

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
  },

  // ==========================================
  // DEVELOPMENT SERVER
  // ==========================================

  /**
   * Dev server config
   * Set reactStrictMode to catch potential issues
   */
  reactStrictMode: true,

  /**
   * SWC Minifier (faster than Terser)
   * Set to false if you need specific Terser options
   */
  swcMinify: true,

  // ==========================================
  // BUILD OPTIMIZATION
  // ==========================================

  /**
   * Production settings
   */
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller builds
  compress: true,

  // ==========================================
  // TYPESCRIPT
  // ==========================================

  typescript: {
    /**
     * Set to false in CI/CD if you want strict type checking
     */
    tsconfigPath: './tsconfig.json',
  },

  // ==========================================
  // SCRIPT OPTIMIZATION
  // ==========================================

  scripts: {
    /**
     * Scripts to load in the document
     * Can be used for analytics, etc.
     */
  },

  // ==========================================
  // STATIC EXPORT (if needed)
  // ==========================================

  /**
   * Uncomment for static export
   * Note: This disables dynamic features like server actions
   */
  // output: 'export',
  // distDir: 'out',

  // ==========================================
  // BASE PATH (if deployed in subdirectory)
  // ==========================================

  /**
   * Set basePath if deploying to a subdirectory
   * E.g., /voltstream for https://example.com/voltstream
   */
  // basePath: '/voltstream',

  // ==========================================
  // TRAILING SLASH
  // ==========================================

  /**
   * Whether to add trailing slashes to URLs
   */
  trailingSlash: false,

}

module.exports = nextConfig
