# ByteMatch

**Buy the right gear — and set it up.** (Formerly ModemMatch; the name grew
up when laptops joined the catalog in October 2026.)

## Networking: ditch your ISP's rental fee

Answer 10 quick questions, get your top 10 modem/router
picks with the *why* behind each — plus the math on when the gear pays for itself.

## Laptops: matched to how you'll actually use them

Answer a short quiz — main use, operating system, screen size, budget,
compatibility needs (asked in plain language, never by chip name) — and get
ranked picks from a 100+ model census with **price ranges** (starting price
*and* max-configuration price, checked Oct 2026), setup guidance for the
exact model, and parental-control setup when the laptop is for a kid.
A model with no verified price never appears — we don't recommend what
can't be bought.

## The idea

ISPs charge $7–$25/month to rent you a modem ($84–$300/year). A good modem costs
$80–$160 once. This app matches your ISP, plan speed, home size, and device count
against a compatibility database and recommends the right gear — no AI needed,
just good data.

## Run it

```bash
pip install flask
python app.py
```

Open **http://localhost:5002** (works great on a phone browser).

## API (phone-app ready)

The quiz brain is an API, so a future native app can call the same endpoints:

- `GET /api/about` → machine-readable basics about this service (what it
  is, categories, endpoint list, data date) so other AI assistants can
  discover and use the API
- `GET /api/isps` → `[{id, name, connection}]`
- `POST /api/recommend` with `{isp, speed_tier, rooms, floors, yard, garage, family_size, tvs, smart_home, setup}`
  (device count is estimated: 2 per person + 1 per TV + smart-home load)
  → `{isp, connection, recommendations[5], savings, notes}`
- `POST /api/recommend-laptops` with `{use, os, screen, budget, snapdragon, usage, kid, ecosystem}`
  → `{recommendations, notes, guides}` — each pick carries `price`
  (starting) + `price_max`, a `why`, and a `setup` ref into `guides`
  (OS first-boot flow + brand setup layer, plus parental controls
  when `kid` is `yes`)

Each recommendation: `{id, name, type, price, performance, stability,
  monthly_cost, amort_months, blurb, why, affiliate_url}`.
  `monthly_cost` spreads the price over 24 months for all-in-one boxes,
  36 months for separate gear. Sort client-side by cheapest,
  stability, or performance-per-dollar.
`savings` includes `yearly_rental`, `equipment_cost`, `first_year_savings`,
`breakeven_months`, and a `headline`.

## Files

- `app.py` — Flask server + recommendation engines (networking + laptops)
- `equipment_db.json` — ISPs (rental fees, connection types) + networking
  equipment with compatibility + the priced laptop catalog
- `laptop_guides.json` — laptop setup guides (OS first-boot flows + brand
  setup layers) and parental-control guides
- `index.html` — mobile-first quizzes + results frontend

## Roadmap

- More ISPs (regional ones next)
- Live price checks via affiliate APIs
- `affiliate_url` fields are empty — sign up for Amazon Associates / Best Buy
  affiliates and fill them in to monetize
- Native app later: wrap the API (see README section above)
