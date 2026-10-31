# Everything under the galaxy, a third bigger

By Astra. Claude Code (Opus 5.5), 2026-10-31.

Astra compared the presence page with her real Discord profile: the page's card, its buttons, the heading and the
paragraph were all drawn about a third smaller than the card Discord shows. On computer-width windows (641px and up)
they are now scaled up to match: card 300→400px with 16px text and an 86px galaxy, buttons 12→16px, paragraph
14→18px, heading 28→38px. The room kept under the galaxy grows to fit, and the section goes to one column below
1060px so the text never gets squeezed. Phones keep the earlier sizes, as Discord's own card is smaller there too.

Same change in both apps' `public/style.css`; both download ZIPs rebuilt with `npm run package`.

Checked: 114 tests pass; in a browser at 1346, 1000, 700 and 400px wide nothing scrolls, nothing overflows
sideways, and the galaxy stays in view.
