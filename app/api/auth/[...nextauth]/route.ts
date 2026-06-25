// Auth.js (NextAuth) catch-all route handler: powers sign-in, OAuth callbacks,
// session, CSRF and sign-out endpoints under /api/auth/*.
//
// This is unavoidable framework glue — Auth.js requires the route module to
// re-export its generated handlers at the top level, so it imports the auth
// config directly rather than going through the composition root. The narrow
// ESLint exception for this path is in .eslintrc.json.
import { handlers } from "@/infrastructure/auth/authConfig";

export const { GET, POST } = handlers;
