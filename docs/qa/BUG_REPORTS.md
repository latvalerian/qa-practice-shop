# QA Practice Shop — Bug Reports

This log records defects found during manual QA. Features and usability improvements belong in the changelog; defects stay here until they pass retest.

**Statuses:** `Reported` → `In progress` → `Fixed — awaiting retest` → `Closed`.

## BUG-UI-001 — Product buttons are misaligned · P2

- **Reported:** 2026-11-17
- **Area:** Catalog cards
- **Status:** Closed
- **Steps:** Open the catalog and compare cards with short and long descriptions.
- **Expected:** `Add to cart` buttons line up at the bottom of cards in the same row.
- **Actual:** Button position changes with description height.
- **Fix:** Made cards vertical flex layouts; descriptions use remaining row space and buttons sit at the bottom.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-002 — Search suggestions stop after navigating away · P2

- **Reported:** 2026-11-19
- **Area:** Homepage search
- **Status:** Closed
- **Steps:** Open the homepage, wait for suggestions to rotate, visit Account or Cart, then return home.
- **Expected:** Suggestions resume rotating from the beginning.
- **Actual:** Suggestions disappear or stop changing until the page is refreshed.
- **Fix:** Run the rotation timer only on the homepage and reset its index when returning.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-003 — Filter popover stays open after an outside click · P2

- **Reported:** 2026-11-19
- **Area:** Catalog filters
- **Status:** Closed
- **Steps:** Open `Filters`, then click outside the filter button and popover.
- **Expected:** The popover closes; clicks inside it continue to work.
- **Actual:** The popover only closes when `Filters` is clicked again.
- **Fix:** Added an outside-pointer handler scoped to the filter control.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-004 — Account dashboard text and controls are too small · P2

- **Reported:** 2026-11-19
- **Area:** Account page
- **Status:** Closed
- **Steps:** Sign in and open `/account` on desktop; compare its text and spacing with the homepage.
- **Expected:** Account content uses readable text and spacing consistent with the storefront, with no horizontal overflow on mobile.
- **Actual:** Most labels and supporting text use 7–11 px sizes, making the page difficult to read and visually inconsistent.
- **Fix:** Increased account typography, control sizes, card spacing and sidebar width; retained a responsive mobile layout.
- **Retest:** Check desktop and mobile widths, including account navigation, order history and the settings dialog.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-005 — Cart preview repeats the same destination · P2

- **Reported:** 2026-11-19
- **Area:** Cart preview
- **Status:** Closed
- **Steps:** Open the cart preview with items and compare `Checkout` with `View full cart`.
- **Expected:** The preview offers one clear action for continuing to the cart.
- **Actual:** Both links navigate to `/cart`.
- **Fix:** Removed the redundant `View full cart` link and kept the primary `Checkout` action.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-006 — Account preview repeats the full-account action · P2

- **Reported:** 2026-11-19
- **Area:** Account preview
- **Status:** Closed
- **Steps:** Open the account preview while signed in and compare its three section links with `Open full account`.
- **Expected:** The preview uses its final action for a useful account action not already represented by those links.
- **Actual:** `Open full account` repeats the same account destination.
- **Fix:** Replaced it with `Sign out`.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-007 — Sign-out actions have no confirmation · P2

- **Reported:** 2026-11-19
- **Area:** Account preview and account page
- **Status:** Closed
- **Steps:** Choose `Sign out` in either the account preview or the account page.
- **Expected:** A confirmation appears; canceling keeps the session active, and confirming signs the user out.
- **Actual:** The session is cleared immediately without confirmation.
- **Fix:** Both controls use the same confirmation before calling the logout API.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-008 — Add-to-cart feedback is out of view after scrolling · P2

- **Reported:** 2026-11-19
- **Area:** Catalog feedback
- **Status:** Closed
- **Steps:** Scroll down through the product list and add an item from a lower row.
- **Expected:** A visible confirmation appears at the center of the viewport regardless of the current scroll position.
- **Actual:** The confirmation was rendered near the catalog heading, outside the viewport when adding products farther down the page.
- **Fix:** Replaced the inline message with a timed, centered status notification managed by the app shell.
- **Retest:** Add an item from the first and a lower product row; verify success/error feedback is centered and dismisses automatically.
- **Retested:** 2026-11-19 — user confirmed the fix works.

## BUG-UI-009 — About link leaves inner pages before reaching the footer · P2

- **Reported:** 2026-11-19
- **Area:** Header navigation
- **Status:** Fixed — awaiting retest
- **Steps:** Open the cart or account page and select `About` once.
- **Expected:** The current page stays open and scrolls directly to the footer; if the footer is already visible, it is briefly highlighted.
- **Actual:** The first click navigates to the homepage without reaching the footer; a second click is needed.
- **Fix:** Scroll directly to the shared footer without changing routes and highlight it briefly.
- **Retest:** Select `About` from the catalog, cart and account pages, both with the footer visible and outside the viewport.
