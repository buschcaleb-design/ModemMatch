# ModemMatch v1

**Ditch your ISP's rental fee.** Answer 10 quick questions, get your top 10 modem/router
picks with the *why* behind each — plus the math on when the gear pays for itself.

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

- `GET /api/isps` → `[{id, name, connection}]`
- `POST /api/recommend` with `{isp, speed_tier, rooms, floors, yard, garage, family_size, tvs, smart_home, setup}`
  (device count is estimated: 2 per person + 1 per TV + smart-home load)
  → `{isp, connection, recommendations[5], savings, notes}`

Each recommendation: `{id, name, type, price, performance, stability,
  monthly_cost, amort_months, blurb, why, affiliate_url}`.
  `monthly_cost` spreads the price over 24 months for all-in-one boxes,
  36 months for separate gear. Sort client-side by cheapest,
  stability, or performance-per-dollar.
`savings` includes `yearly_rental`, `equipment_cost`, `first_year_savings`,
`breakeven_months`, and a `headline`.

## Files

- `app.py` — Flask server + recommendation engine
- `equipment_db.json` — ISPs (rental fees, connection types) + equipment with compatibility
- `index.html` — mobile-first quiz + results frontend

## Roadmap

- More ISPs (regional ones next)
- Live price checks via affiliate APIs
- `affiliate_url` fields are empty — sign up for Amazon Associates / Best Buy
  affiliates and fill them in to monetize
- Native app later: wrap the API (see README section above)
