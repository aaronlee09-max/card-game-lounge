# Graphics, dependencies and rule references

The seven new app icons are drawn by worker/create-board-apps.py. Fruit graphics are original inline SVG, numbered tiles and wood blocks are CSS, and memory/chess symbols use the platform's Unicode font. No publisher logos, scans, box art or downloaded commercial game artwork is included. Existing game assets are retained.

Rummikub, Jenga and Halli Galli are used as descriptive game names. The UI identifies these as unofficial implementations and does not claim affiliation. This source/asset review is not trademark clearance.

Chess rules: chess.js 1.4.0, BSD-2-Clause; full license in dist/vendor/chess-LICENSE.txt. Its bundled JavaScript is checked into dist/vendor/chess.js. The practice AI is original code in dist/lounge-rules.js. Other new rule engines and graphics are original code.

Primary rule references consulted:
- Rummikub: https://rummikub.com/rules/
- FIDE Laws of Chess: https://handbook.fide.com/chapter/E012023
- Renju International Federation: https://www.renju.net/rifrules/
- Jenga: https://www.jenga.com/about.php
- Halli Galli: https://www.amigo-spiele.de/spiele/halli-galli

Documented digital variants: free joker rearrangement; support/centre-of-mass tower model; automated draw claims in chess; no tournament Renju opening protocol. Local bell order uses the first processed input; online bell order uses the server's accepted move and version checks.
