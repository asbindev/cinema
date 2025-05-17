
export { default } from "next-auth/middleware"

// Applies NextAuth middleware to specified paths
// This will protect all routes under /admin
export const config = { matcher: ["/admin/:path*"] }
