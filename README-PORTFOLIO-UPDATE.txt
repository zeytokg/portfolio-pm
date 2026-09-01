ZEYTOKG PORTFOLIO — TRILINGUAL UI/UX REFRESH
Updated: 2026-09-01

WHAT CHANGED
- EN / IT / TR language support added across the main portfolio pages.
- Language now auto-detects the device/browser primary language: English, Italian or Turkish; all unsupported languages default to English.
- A language chosen manually from the site selector is remembered across pages and overrides auto-detection.
- Easy Apply pages now support Italian in addition to English and Turkish.
- Instagram Unfollowers pages now support English, Italian and Turkish.
- Mobile homepage hero was reworked: the portrait now sits beside the name instead of dropping to the bottom of the hero card.
- Selected Work cards now look and behave like clickable case-study cards, including keyboard support.
- Added subtle scroll-in motion, hover feedback, active/focus states, card depth and smoother interactions.
- Mobile navigation and tap targets were improved.
- Selected Work truncation is now mobile-only; desktop shows all cases.
- The embedded profile image was extracted to images/zeynep-profile.png for a much lighter index.html and better caching.
- Broken References download link was replaced with a working link to the testimonials/references section.
- Broken About anchors on inner portfolio pages now point to the homepage hero.

NEW SHARED FILES
- portfolio-enhancements.css
- portfolio-ui.js
- portfolio-i18n.js

PUBLISHING
Upload/replace the contents of this package in the GitHub Pages repository root and commit/push. Keep the directory structure unchanged.

NOTE
Product/game names, company names, technical terms and KPI abbreviations (ARPU, LTV, LiveOps, D1/D7, etc.) are intentionally left in their industry-standard form where that reads more naturally.

2026-09 UI/UX patch:
- tools.html upgraded with clearer tool cards, stronger category hierarchy, sticky navigation polish and improved responsive layout.
- Floating Back Home / Back to Top controls standardized across inner pages.
- Floating controls made slightly more visible (stronger border/background/contrast) while preserving the minimal visual language.
- Back to Top now appears after ~360px of scroll instead of 500px.
- Home page keeps only Back to Top; inner pages keep both Home and Top controls.
- Existing automatic device-language behavior remains intact: tr -> Turkish, it -> Italian, en -> English, unsupported languages -> English; explicit manual language choice remains remembered.

2026-09 UI refinement: language selector now has a globe + visible Language label + stronger control treatment. Homepage testimonials heading hierarchy and quote cards were polished for clearer scanning.


LANGUAGE PATCH — EASY APPLY + INSTAGRAM UNFOLLOWERS
- Easy Apply website: EN / TR / IT, automatic device/browser primary-language detection.
- Instagram Unfollowers website (index/privacy/security/extension): EN / TR / IT, automatic device/browser primary-language detection.
- Unsupported device/browser languages fall back to English.
- A manual language choice is remembered and takes priority until changed.
- Language controls now use a prominent globe + Language/Dil/Lingua + EN/IT/TR selector, matching the main portfolio UI.
