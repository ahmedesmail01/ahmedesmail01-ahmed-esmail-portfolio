# Previous route templates

These components preserve the route implementations from before the Sylva redesign, byte-for-byte:

| Previous route | Archived component |
| --- | --- |
| `/blogs/` | `blogs-page.tsx` |
| `/blogs/[slug]/` | `blog-article-page.tsx` |
| `/project/[projectSlug]/` | `project-detail-page.tsx` |
| `/services/` | `services-page.tsx` |
| Application 404 | `not-found-page.tsx` |

The original imports, metadata, and static generation helpers are preserved. To restore a route, copy its archived module back to the corresponding `app` route. The archive imports the existing legacy site shell and styling; it is not linked from the new public navigation.

The previous home templates are preserved separately in `components/home/legacy-home-page.tsx`, `components/home/sublevel-home-page.tsx`, and `components/home/sylva-hero-home-page.tsx` (the Sylva hero-only homepage).
