// Next.js requires the App Router root at `app/` (or `src/app/`).
// The real presentation/interface code lives in `src/interfaces/web/app`
// to honor the Clean Architecture layout. These files are thin re-exports.
export { metadata, default } from "@/interfaces/web/app/layout";
