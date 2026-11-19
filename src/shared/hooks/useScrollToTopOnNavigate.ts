import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scroll the page back to the top when the user navigates to a different route.
//
// A SPA does not reload the document, so without this the window keeps whatever
// scroll offset the previous page had: drilling from halfway down the CRM
// dashboard into an insight page landed the user halfway down the new page,
// looking at the middle of a table with the header off-screen.
//
// The WINDOW is the scroll container here — `AppShell` lays out with
// `min-h-screen` and no `overflow-y-auto` on <main>, so the document itself
// scrolls (the same reason `FloatingQueryButton` can use `window.scrollTo`). If
// <main> ever becomes its own scroll area, this must move to that element's
// `scrollTop`; `window.scrollTo` would silently do nothing.
//
// React Router's own `<ScrollRestoration />` is NOT an option: it requires a
// data router, and this app mounts `<BrowserRouter>` (`app/providers.tsx`).
export function useScrollToTopOnNavigate() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // Track the navigation type WITHOUT making it a dependency of the scroll
  // effect below. It changes on its own — a PUSH followed by a
  // `setSearchParams(..., { replace: true })` flips it PUSH -> REPLACE — and as
  // a dep that flip would re-fire the effect on the SAME pathname, scrolling
  // the user to the top the instant they clicked page 2.
  //
  // Synced in its own effect, not during render: writing a ref mid-render is a
  // React violation (and an eslint error under `react-hooks/refs`). Effects run
  // in declaration order, so this one lands before the scroll effect reads it.
  const navigationTypeRef = useRef(navigationType);
  useEffect(() => {
    navigationTypeRef.current = navigationType;
  }, [navigationType]);

  useEffect(() => {
    // POP is browser back/forward. The user is returning to a page they have
    // already read, so their previous position IS the right position — yanking
    // them to the top there loses their place, which is the usual complaint
    // about over-eager scroll-to-top. Let the browser restore instead.
    if (navigationTypeRef.current === "POP") return;

    // Instant, not smooth: the new route is mounting underneath, and animating
    // a scroll through half-rendered content reads as jank rather than polish.
    //
    // `behavior` MUST be stated. Omitting it defaults to "auto", and "auto"
    // means "defer to the element's CSS scroll-behavior" — which is `smooth`
    // on <html> (`styles/index.css`). So the default silently produced the
    // exact animation this comment rules out: a visible scroll up through the
    // half-rendered page instead of opening at the top.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // PATHNAME ONLY — deliberately not `location.search`. Paging, filters,
    // period, the My/Team scope toggle and the detail-page tabs are ALL query
    // params (`?page=2`, `?accountsPage=3`, `?funnelLeadsPage=2`, `?period=…`).
    // Including `search` would scroll the user to the top every time they paged
    // a table or switched a tab, which is worse than the bug being fixed.
  }, [pathname]);
}
