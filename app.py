"""
ByteMatch — buy the right gear, and set it up right.
(Started life as ModemMatch, the ISP rental-fee killer; laptops joined
in Oct 2026 and the name grew up with the catalog.)
API-first design: the quiz engine is an API, so a future phone app —
or another AI assistant via /api/about — can call the same endpoints
the web frontend uses.

Run:  pip install flask
      python app.py
Then open http://localhost:5002
"""
import json
import os
import re
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)
BASE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE, "equipment_db.json")) as f:
    DB = json.load(f)

ISPS = {i["id"]: i for i in DB["isps"]}
EQUIP = DB["equipment"]
LAPTOPS = DB.get("laptops", [])
# Laptop setup/parental guides live in their own file (keeps equipment_db.json
# pushable); fall back to embedded copies if the file is ever absent.
_guides_file = {}
_guides_path = os.path.join(BASE, "laptop_guides.json")
if os.path.exists(_guides_path):
    with open(_guides_path) as f:
        _guides_file = json.load(f)
LAPTOP_GUIDES = _guides_file.get("laptop_setup_guides",
                                 DB.get("laptop_setup_guides", {}))
LAPTOP_PARENTAL = _guides_file.get("laptop_parental_controls",
                                   DB.get("laptop_parental_controls", {}))
# Desktops live in their own file too (same pattern as the guides);
# fall back to an embedded copy if the file is ever absent.
_desktops_file = {}
_desktops_path = os.path.join(BASE, "desktops.json")
if os.path.exists(_desktops_path):
    with open(_desktops_path) as f:
        _desktops_file = json.load(f)
DESKTOPS = _desktops_file.get("desktops", DB.get("desktops", []))

SPEED_MIN = {
    "under100": 0, "100-300": 100, "300-600": 300,
    "600-1000": 600, "1000plus": 1000,
}


# ---------------------------------------------------------------- API
@app.route("/api/isps")
def api_isps():
    """List supported ISPs. Phone apps call this to build the first quiz step."""
    return jsonify([
        {"id": i["id"], "name": i["name"], "connection": i["connection"]}
        for i in DB["isps"]
    ])


@app.route("/api/about")
def api_about():
    """Machine-readable basics about this service — so people AND other AI
    assistants can discover what ByteMatch does and how to call it."""
    meta = DB.get("meta", {})
    return jsonify({
        "name": "ByteMatch",
        "tagline": "Buy the right gear — and set it up.",
        "description": (
            "ByteMatch helps people buy the right tech gear and set it up. "
            "Networking: answer a short quiz about your ISP and home and get "
            "ranked modem/router/mesh picks that replace an ISP rental, with "
            "the savings math. Computers: answer a short quiz (use, operating "
            "system, screen size for laptops or case size for desktops, "
            "budget, compatibility needs) and get ranked laptop or desktop "
            "picks with starting and max-configuration prices, setup "
            "guidance, and — for kids' computers — parental-control setup."),
        "categories": {
            "networking_gear": len(EQUIP),
            "isps": len(DB["isps"]),
            "laptops": len(LAPTOPS),
            "desktops": len(DESKTOPS),
        },
        "endpoints": [
            {"method": "GET", "path": "/api/about",
             "description": "This document."},
            {"method": "GET", "path": "/api/isps",
             "description": "List supported ISPs: [{id, name, connection}]."},
            {"method": "POST", "path": "/api/recommend",
             "description": "Networking picks. JSON: {isp, speed_tier, rooms, "
                            "floors, yard, garage, family_size, tvs, "
                            "smart_home, setup} -> {recommendations, savings, "
                            "notes}."},
            {"method": "POST", "path": "/api/recommend-laptops",
             "description": "Laptop picks. JSON: {use, os, screen, budget, "
                            "snapdragon, usage, kid, ecosystem} -> "
                            "{recommendations, notes, guides}. Each pick "
                            "carries a summary plus a why list: the reasons "
                            "it was picked for those answers. Prices are a "
                            "range: price (starting) and price_max."},
            {"method": "POST", "path": "/api/recommend-desktops",
             "description": "Desktop picks. JSON: {use, os, case, budget, "
                            "snapdragon, usage, kid, ecosystem} -> "
                            "{recommendations, notes, guides}. Case is the "
                            "case-size bucket: mini|sff|tower|full|aio. "
                            "Each pick carries a summary plus a why list. "
                            "Prices are a range: price (starting) and "
                            "price_max (null when only a starting price "
                            "could be verified)."},
            {"method": "GET", "path": "/api/laptop-guides",
             "description": "Laptop setup-guide library: OS first-boot "
                            "flows, per-brand setup layers, first-week "
                            "checklist, and parental controls per platform."},
            {"method": "GET", "path": "/api/laptop-search?q=<text>",
             "description": "'Know your model?' lookup: matches a typed "
                            "name, an old line name (formerly), or a "
                            "model-number code (CX34, DB04250, EBT2250) "
                            "against the laptop and desktop catalogs. Each "
                            "match carries its type (laptop|desktop)."},
            {"method": "GET", "path": "/api/setup-guide/<isp_id>?gear=separate|combo",
             "description": "Networking setup walkthrough for an ISP."},
        ],
        "data_updated": meta.get("updated"),
        "version": meta.get("version"),
    })


@app.route("/api/recommend", methods=["POST"])
def api_recommend():
    """
    The whole brain. POST JSON:
      {isp, speed_tier, home_size, devices, setup}
    Returns ranked top-5 picks with the 'why' for each, plus savings math.
    """
    a = request.get_json(force=True)
    isp_id = a.get("isp")
    isp = ISPS.get(isp_id)
    if not isp:
        return jsonify({"error": "unknown ISP"}), 400

    speed = SPEED_MIN.get(a.get("speed_tier", "100-300"), 100)
    rooms = a.get("rooms", "3-4")               # 1-2 | 3-4 | 5-6 | 7plus
    floors = a.get("floors", "1")               # 1 | 2 | 3plus
    yard = a.get("yard", "no")                  # no | small | large
    garage = a.get("garage", "no")              # no | yes
    devices = a.get("devices", "some")          # few | some | many (legacy)
    # Estimate device count: 2 per person (phone + laptop), 1 per TV,
    # plus smart-home load. Nobody wants to count these by hand.
    people = {"1": 1, "2": 2, "3": 3, "4": 4, "5plus": 6}.get(
        a.get("family_size", "2"), 2)
    tvs = {"0": 0, "1": 1, "2": 2, "3": 3, "4plus": 5}.get(
        a.get("tvs", "1"), 1)
    smart = {"none": 0, "some": 5, "lots": 15}.get(
        a.get("smart_home", "none"), 0)
    est_devices = people * 2 + tvs + smart
    if "family_size" in a:  # new quiz path overrides legacy bucket
        devices = "few" if est_devices < 10 else "many" if est_devices > 25 else "some"
    setup = a.get("setup", "separate")          # separate | combo | router_only
    conn = isp["connection"]
    needs_mesh = (floors in ("2", "3plus") or rooms in ("5-6", "7plus")
                  or yard != "no" or garage == "yes" or devices == "many")
    coverage_notes = []
    if floors in ("2", "3plus"):
        coverage_notes.append("multi-floor home")
    if rooms in ("5-6", "7plus"):
        coverage_notes.append(f"{rooms.replace('plus', '+')} rooms")
    if yard != "no":
        coverage_notes.append("yard coverage")
    if garage == "yes":
        coverage_notes.append("garage coverage")

    picks = []   # (equipment, why, score)

    def by_type(*types):
        return [e for e in EQUIP
                if e["type"] in types and isp_id in e["compatible_isps"]]

    if conn == "cable":
        need_31 = speed >= 600
        modems = [e for e in by_type("modem")
                  if (e.get("docsis") == "3.1") or not need_31]
        modems.sort(key=lambda e: (e.get("docsis") != "3.1", e["price"]))
        combos = [e for e in by_type("combo")
                  if (e.get("docsis") == "3.1") or not need_31]
        combos.sort(key=lambda e: e["price"])
        routers = by_type("router", "mesh")
        mesh = sorted([e for e in routers if e["type"] == "mesh"],
                      key=lambda e: e["price"])
        plain = sorted([e for e in routers if e["type"] == "router"],
                       key=lambda e: e["price"])
        routers_ordered = (mesh + plain) if needs_mesh else (plain + mesh)

        if setup == "combo":
            for e in combos:
                picks.append((e, _why_combo(e, isp, speed), 90))
            for e in routers_ordered[:3]:
                picks.append((e, _why_router(e, coverage_notes, False) +
                              " (Pairs with a standalone modem if you ever split up.)", 60))
        elif setup == "modem_only":
            for e in modems:
                picks.append((e, _why_modem(e, isp, speed), 90))
        elif setup == "router_only":
            for e in routers_ordered:
                picks.append((e, _why_router(e, coverage_notes, False), 90))
        else:  # separate modem + router: the classic money-saving setup
            for e in modems:
                picks.append((e, _why_modem(e, isp, speed), 100))
            for e in routers_ordered:
                picks.append((e, _why_router(e, coverage_notes, False), 85))
            for e in combos[:2]:
                picks.append((e, _why_combo(e, isp, speed) +
                              " (Simpler alternative to two boxes.)", 55))

    elif conn == "fiber":
        # No modem to buy — ISP gateway is mandatory; win is a better router.
        routers = by_type("router", "mesh")
        mesh = sorted([e for e in routers if e["type"] == "mesh"],
                      key=lambda e: e["price"])
        plain = sorted([e for e in routers if e["type"] == "router"],
                       key=lambda e: e["price"])
        ordered = (mesh + plain) if needs_mesh else (plain + mesh)
        for e in ordered[:4]:
            picks.append((e, _why_router(e, coverage_notes, False) +
                          " Pairs with your ISP gateway in passthrough mode.", 90))
        notes_extra = [
            f"{isp['name']} requires their gateway — you can't replace it. "
            "The win here is putting your own router behind it for better WiFi."
        ]

    elif conn == "dsl":
        dsl = by_type("dsl_modem")
        routers = sorted(by_type("router", "mesh"), key=lambda e: e["price"])
        for e in dsl[:1]:
            picks.append((e, "Replaces your DSL rental modem.", 100))
        for e in routers[:2]:
            picks.append((e, _why_router(e, coverage_notes, False), 80))

    notes_extra = locals().get("notes_extra", [])

    fee = isp["rental_fee_monthly"]

    # Rank, dedupe, keep up to 10 (frontend shows 5, "more" reveals the rest)
    seen, ranked = set(), []
    for e, why, score in sorted(picks, key=lambda p: -p[2]):
        if e["id"] not in seen:
            seen.add(e["id"])
            life_mo = 24 if e["type"] == "combo" else 36
            ranked.append({"id": e["id"], "name": e["name"],
                           "type": e["type"], "price": e["price"],
                           "performance": e.get("performance", 5),
                           "stability": e.get("stability", 5),
                           "saves_over_life": fee * life_mo - e["price"],
                           "life_years": life_mo // 12,
                           "blurb": e.get("blurb", ""), "why": why,
                           "affiliate_url": ""})
        if len(ranked) == 10:
            break

    # Savings math — cost reflects what they'd actually buy
    if setup == "separate":
        modem_cost = next((r["price"] for r in ranked
                           if r["type"] == "modem"), 0)
        router_cost = next((r["price"] for r in ranked
                            if r["type"] in ("router", "mesh")), 0)
        total_cost = modem_cost + router_cost
    else:
        total_cost = ranked[0]["price"] if ranked else 0
    yearly_rent = fee * 12
    if fee > 0 and total_cost:
        breakeven = max(1, round(total_cost / fee))
        savings = {"yearly_rental": yearly_rent,
                   "equipment_cost": total_cost,
                   "breakeven_months": breakeven,
                   "yearly_savings_after_payback": yearly_rent,
                   "headline": (f"Ditch the ${fee}/mo rental and this setup pays "
                                f"for itself in ~{breakeven} months — then it's "
                                f"${yearly_rent}/yr back in your pocket.")}
    else:
        savings = {"yearly_rental": 0, "equipment_cost": total_cost,
                   "first_year_savings": 0, "breakeven_months": 0,
                   "headline": ("Your ISP includes the gateway — "
                                "these picks are about better WiFi, not killing a fee.")}

    return jsonify({
        "isp": isp["name"],
        "connection": conn,
        "estimated_devices": est_devices,
        "recommendations": ranked,
        "savings": savings,
        "notes": [isp.get("notes", "")] + notes_extra,
    })


# ---------------------------------------------------------------- laptops
LAPTOP_OS_KEY = {"Windows": "windows_11", "macOS": "macos",
                 "ChromeOS": "chromeos"}
LAPTOP_PLATFORM_OF = {"windows": "Windows", "mac": "macOS",
                      "chromebook": "ChromeOS"}
LAPTOP_USE_CATEGORY = {"school": "everyday", "everyday": "everyday",
                       "work": "business", "gaming": "gaming",
                       "creative": "creator"}
LAPTOP_USE_AFFINITY = {
    "school": {"2-in-1": 10, "ultraportable": 6},
    "everyday": {"ultraportable": 6, "2-in-1": 5},
    "work": {"ultraportable": 8, "2-in-1": 4},
    "gaming": {"creator": 8},
    "creative": {"gaming": 6, "ultraportable": 5},
}
LAPTOP_CATEGORY_WHY = {
    "gaming": "A gaming laptop first — dedicated graphics for play",
    "creator": "Made for creative work — strong CPU/GPU for editing and rendering",
    "business": "A business laptop — built for workdays, calls, and documents",
    "everyday": "An everyday laptop for web, email, streaming, and documents",
    "ultraportable": "An ultraportable — light carry and long battery, still a full laptop",
    "2-in-1": "A 2-in-1 — folds into a tablet when you want it to",
}


def _laptop_screen_band(d):
    if d is None:
        return None
    if d <= 14.5:
        return "13-14"
    if d <= 16.5:
        return "15-16"
    return "17plus"


def _laptop_in_budget(price, band):
    if band == "under500":
        return price < 500
    if band == "500-900":
        return 500 <= price <= 900
    if band == "900-1400":
        return 900 < price <= 1400
    if band == "1400plus":
        return price > 1400
    return True


def _fmt_price(p):
    """499.99 -> '$499.99', 999.0 -> '$999', 1400.0 -> '$1,400'."""
    s = f"{p:,.2f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return "$" + s


@app.route("/api/recommend-laptops", methods=["POST"])
def api_recommend_laptops():
    """
    Laptop picks. POST JSON:
      {use, os, screen, budget, snapdragon, usage, kid, ecosystem}
    use: school|everyday|work|gaming|creative
    os: windows|mac|chromebook|any
    screen: 13-14|15-16|17plus|any
    budget: under500|500-900|900-1400|1400plus|any  (matched on starting price)
    snapdragon: no|yes|unsure — "Do you need to run specific Windows programs,
      older printers/accessories, or anti-cheat games?" yes/unsure excludes
      Snapdragon-only machines (the safe lane); no makes them eligible.
    usage: light|heavy — browser+documents vs big apps+lots of files.
    kid: yes|no — yes adds parental-control setup guidance per platform.
    ecosystem: {wants, phone, tv, watch} — manufacturer names the buyer owns;
      same-brand laptops get a boost with the reason shown.
    Returns ranked top-10 with price ranges, why strings, setup guides.
    """
    a = request.get_json(force=True, silent=True) or {}
    use = a.get("use", "everyday")
    os_pref = a.get("os", "any")
    screen = a.get("screen", "any")
    budget = a.get("budget", "any")
    snap_answer = a.get("snapdragon", "unsure")
    usage = a.get("usage", "light")
    kid = a.get("kid", "no") == "yes"
    eco = a.get("ecosystem") or {}
    eco_wants = bool(eco.get("wants"))
    eco_owned = {k: (eco.get(k) or "").strip() for k in ("phone", "tv", "watch")}
    notes = []

    pool = list(LAPTOPS)
    # Hard filter: platform
    platform = LAPTOP_PLATFORM_OF.get(os_pref)
    if platform:
        pool = [l for l in pool if l["platform"] == platform]
    # Hard filter: Snapdragon lane (all Snapdragon models here are Windows)
    if snap_answer in ("yes", "unsure"):
        kept = []
        for l in pool:
            if l["snapdragon"] and l["architecture"] != "both":
                continue  # Snapdragon-only machine — not the safe lane
            kept.append(l)
        pool = kept
    elif snap_answer == "no":
        notes.append(
            "Snapdragon laptops are in the mix — that's the battery-life "
            "lane. Mainstream apps (browser, Office, Zoom) run great on them.")
    # Hard filters with graceful relaxation: screen, then budget
    relaxed = []
    if screen != "any":
        in_band = [l for l in pool
                   if _laptop_screen_band(l["display_inches"]) in (screen, None)]
        if len(in_band) >= 3:
            pool = in_band
        else:
            relaxed.append("screen size")
    if budget != "any":
        in_budget = [l for l in pool if _laptop_in_budget(l["price"], budget)]
        if len(in_budget) >= 3:
            pool = in_budget
        else:
            relaxed.append("budget")
    if any(l["platform"] == "ChromeOS" for l in pool):
        notes.append(
            "There is no Google-made laptop — Chromebooks are built by "
            "partner brands (Acer, ASUS, HP, Lenovo). The ones marked "
            "Chromebook Plus are Google's higher-spec tier.")
    # Ecosystem honesty notes (brand-level facts only)
    phone_b, watch_b = eco_owned.get("phone", ""), eco_owned.get("watch", "")
    if eco_wants and watch_b.lower() == "apple" and phone_b and phone_b.lower() != "apple":
        notes.append("An Apple Watch only pairs with an iPhone — it won't "
                     "connect to a " + phone_b + " phone, whichever laptop you pick.")
    if eco_wants and watch_b.lower() == "samsung" and phone_b and phone_b.lower() != "samsung":
        notes.append("A Galaxy Watch works with other Android phones, but a "
                     "few health features (like ECG) need a Samsung phone.")

    want_cat = LAPTOP_USE_CATEGORY.get(use, "everyday")
    affinity = LAPTOP_USE_AFFINITY.get(use, {})

    def score(l):
        s, why_bits = 50.0, []
        if l["laptop_category"] == want_cat:
            s += 40
            why_bits.append(LAPTOP_CATEGORY_WHY[want_cat])
        elif l["laptop_category"] in affinity:
            s += affinity[l["laptop_category"]]
            why_bits.append(LAPTOP_CATEGORY_WHY[l["laptop_category"]])
        band = _laptop_screen_band(l["display_inches"])
        if screen != "any" and band == screen:
            s += 12
        if usage == "heavy":
            if l["ram_max_gb"] and l["ram_max_gb"] >= 16:
                s += 8
            if l["storage_max_gb"] and l["storage_max_gb"] >= 512:
                s += 8
        if snap_answer == "no" and l["snapdragon"]:
            s += 10
            why_bits.append("Snapdragon powered — the battery-life lane")
        eco_note = None
        if eco_wants:
            matched = []
            if phone_b and l["brand"].lower() == phone_b.lower():
                s += 25
                matched.append("phone")
            if eco_owned["tv"] and l["brand"].lower() == eco_owned["tv"].lower():
                s += 10
                matched.append("TV")
            if watch_b and l["brand"].lower() == watch_b.lower():
                s += 10
                matched.append("smartwatch")
            if matched:
                eco_note = (f"Same brand as your {' and '.join(matched)} "
                            f"({l['brand']}) — one ecosystem: account, apps, "
                            "and device perks line up best inside one brand's world.")
        return s, why_bits, eco_note

    budget_label = {"under500": "under $500", "500-900": "$500–$900",
                    "900-1400": "$900–$1,400",
                    "1400plus": "over $1,400"}.get(budget)
    screen_label = {"13-14": "13–14″", "15-16": "15–16″",
                    "17plus": "17″+"}.get(screen)

    def why_list_for(l, eco_note):
        """Per-pick reasons for the 'Why we picked this laptop' dropdown.
        Every bullet traces to a quiz answer or a data field — no filler."""
        bullets = []
        cat = l["laptop_category"]
        frag = LAPTOP_CATEGORY_WHY.get(cat, "")
        if frag and cat == want_cat:
            bullets.append(f"For {use}: {frag[0].lower() + frag[1:]}.")
        elif frag and cat in affinity:
            bullets.append(f"Close match for {use}: {frag[0].lower() + frag[1:]}.")
        if os_pref != "any":
            bullets.append(f"Runs {l['platform']} — the system you asked for.")
        band = _laptop_screen_band(l["display_inches"])
        if screen != "any" and screen_label and l["display_inches"]:
            if band == screen:
                bullets.append(f"{l['display_inches']}″ screen — the "
                               f"{screen_label} size you picked.")
            elif band is not None:
                bullets.append(
                    f"{l['display_inches']}″ screen — outside the "
                    f"{screen_label} size you picked; we widened the net "
                    "because few laptops matched everything you asked for.")
        if budget != "any" and budget_label:
            price = l["price"]
            if _laptop_in_budget(price, budget):
                spot = ""
                spans = {"under500": (0, 500), "500-900": (500, 900),
                         "900-1400": (900, 1400)}
                if budget in spans:
                    lo, hi = spans[budget]
                    r = (price - lo) / (hi - lo)
                    spot = (" — near the low end of that budget" if r <= 0.34
                            else " — near the top of that budget" if r >= 0.67
                            else " — mid-range in that budget")
                bullets.append(f"Starts at {_fmt_price(price)} — inside your "
                               f"{budget_label} budget{spot}.")
            else:
                bullets.append(
                    f"Starts at {_fmt_price(price)} — outside your "
                    f"{budget_label} budget; it stayed in because few "
                    "laptops matched your other answers.")
        if usage == "heavy":
            strong = []
            if l["ram_max_gb"] and l["ram_max_gb"] >= 16:
                strong.append(f"up to {l['ram_max_gb']}GB RAM")
            if l["storage_max_gb"] and l["storage_max_gb"] >= 512:
                strong.append(f"up to {l['storage_max_gb']}GB storage")
            if strong:
                bullets.append("Headroom for big apps and lots of files: "
                               "configures " + " and ".join(strong) + ".")
        elif l["ram_min_gb"]:
            b = f"Starts at {l['ram_min_gb']}GB RAM"
            if l["storage_min_gb"]:
                b += f" and {l['storage_min_gb']}GB storage"
            bullets.append(b + " — plenty for browser, email, "
                               "and document work.")
        if l["platform"] == "Windows":
            if l["snapdragon"] and l["architecture"] == "both":
                if snap_answer in ("yes", "unsure"):
                    bullets.append(
                        "Sold in Intel and Snapdragon versions — the "
                        "Intel/AMD version is the safe pick for the programs, "
                        "printers, or games you need to run.")
                else:
                    bullets.append(
                        "Sold in Snapdragon and Intel versions — the "
                        "Snapdragon version is the long-battery one, and "
                        "you cleared the compatibility question.")
            elif l["snapdragon"]:
                bullets.append(
                    "Snapdragon-powered — the battery-life lane, and you "
                    "said you don't need the specific Windows programs, "
                    "older printers, or anti-cheat games that can trip "
                    "it up.")
            elif snap_answer in ("yes", "unsure"):
                bullets.append(
                    "Intel/AMD inside — the compatibility-safe lane for "
                    "specific Windows programs, older printers, and "
                    "anti-cheat games.")
        if eco_note:
            bullets.append(eco_note)
        if l["platform"] == "ChromeOS" and \
                "chromebook plus" in l["name"].lower():
            bullets.append("A Chromebook Plus — Google's higher-spec "
                           "Chromebook tier.")
        if l.get("formerly"):
            bullets.append(f"Rebrand note: this is {l['brand']}'s successor "
                           f"to the {l['formerly']} line — same family, "
                           "new name.")
        if kid:
            par = LAPTOP_PARENTAL.get("platforms", {}).get(
                LAPTOP_OS_KEY[l["platform"]]) or {}
            cs = par.get("control_system")
            if cs:
                bullets.append(
                    f"For your kid: {l['platform']} parental controls run "
                    f"through {cs} — the setup page (button at the bottom "
                    "of these results) walks through the child account, "
                    "limits, and approvals.")
            else:
                bullets.append(
                    "For your kid: this platform has built-in parental "
                    "controls — the setup page (button at the bottom of "
                    "these results) walks through them.")
        return bullets

    scored = []
    for l in pool:
        s, why_bits, eco_note = score(l)
        why = ". ".join(why_bits) + "." if why_bits else "A solid all-rounder."
        if usage == "heavy" and l["ram_max_gb"]:
            why += (f" Specs go up to {l['ram_max_gb']}GB RAM"
                    + (f" and {l['storage_max_gb']}GB storage"
                       if l["storage_max_gb"] else "") + ".")
        scored.append((s, l, why, eco_note))
    scored.sort(key=lambda t: (-t[0], t[1]["price"]))

    # Brand diversity: cap 3 per brand in the first pass, then backfill
    ranked, deferred, per_brand = [], [], {}
    for item in scored:
        b = item[1]["brand"]
        if per_brand.get(b, 0) < 3:
            ranked.append(item)
            per_brand[b] = per_brand.get(b, 0) + 1
        else:
            deferred.append(item)
    ranked = (ranked + deferred)[:10]

    recs, os_keys, brand_keys = [], set(), set()
    for s, l, why, eco_note in ranked:
        os_key = LAPTOP_OS_KEY[l["platform"]]
        brand_key = l["brand"].lower()
        os_keys.add(os_key)
        brand_keys.add(brand_key)
        recs.append({
            "id": l["id"], "name": l["name"], "brand": l["brand"],
            "type": "laptop", "laptop_category": l["laptop_category"],
            "platform": l["platform"], "display_inches": l["display_inches"],
            "cpu": l["cpu"], "ram_text": l["ram_text"],
            "storage_text": l["storage_text"], "gpu": l["gpu"],
            "weight_text": l["weight_text"],
            "architecture": l["architecture"], "snapdragon": l["snapdragon"],
            "formerly": l["formerly"], "source_url": l["source_url"],
            "price": l["price"], "price_max": l["price_max"],
            "price_source": l["price_source"],
            "max_config_note": l["max_config_note"],
            "score": round(s), "why": why_list_for(l, eco_note),
            "summary": why, "ecosystem_note": eco_note,
            "cpu_check": bool(l["snapdragon"] and l["architecture"] == "both"),
            "setup": {"os_key": os_key, "brand_key": brand_key},
        })

    # Setup guidance for exactly the platforms/brands in these results
    guides = {"os_flows": {}, "brand_layers": {},
              "first_week_checklist": [], "parental": None}
    for k in os_keys:
        if k in LAPTOP_GUIDES.get("os_flows", {}):
            guides["os_flows"][k] = LAPTOP_GUIDES["os_flows"][k]
    for k in brand_keys:
        if k in LAPTOP_GUIDES.get("brand_layers", {}):
            guides["brand_layers"][k] = LAPTOP_GUIDES["brand_layers"][k]
    plat_tokens = set()
    for l in [r for r in recs]:
        plat_tokens |= {"windows_11": {"windows", "all"},
                        "macos": {"macos", "mac", "all"},
                        "chromeos": {"chromeos", "chrome", "all"}}[LAPTOP_OS_KEY[l["platform"]]]
    for c in LAPTOP_GUIDES.get("first_week_checklist", []):
        if str(c.get("applies_to", "all")).lower() in plat_tokens:
            guides["first_week_checklist"].append(c)
    if kid:
        guides["parental"] = {
            "core_principle": LAPTOP_PARENTAL.get("core_principle"),
            "platforms": {k: LAPTOP_PARENTAL.get("platforms", {}).get(k)
                          for k in os_keys
                          if LAPTOP_PARENTAL.get("platforms", {}).get(k)},
        }

    # Catalog fact for the results screen's filter fallback: does a
    # touchscreen 2-in-1 exist at all for the requested system? (macOS has
    # none — Apple doesn't make one — so the UI can say the feature isn't
    # available there instead of dead-ending on an empty filter.)
    cat_platform = LAPTOP_PLATFORM_OF.get(os_pref)
    two_in_one_available = any(
        l["laptop_category"] == "2-in-1" and
        (cat_platform is None or l["platform"] == cat_platform)
        for l in LAPTOPS)

    return jsonify({
        "recommendations": recs,
        "notes": notes,
        "guides": guides,
        "kid": kid,
        "filter_facts": {"two_in_one_available": two_in_one_available},
        "query": {"use": use, "os": os_pref, "screen": screen,
                  "budget": budget, "snapdragon": snap_answer,
                  "usage": usage},
    })


# ---------------------------------------------------------------- desktops
DESKTOP_PLATFORM_OF = {"windows": "Windows", "mac": "macOS",
                       "chromebook": "ChromeOS"}
DESKTOP_CASE_LABEL = {"mini": "Mini PC", "sff": "Small form factor",
                      "tower": "Tower", "full": "Full tower",
                      "aio": "All-in-one"}
DESKTOP_USE_CATEGORY = {"school": "everyday", "everyday": "everyday",
                        "work": "business", "gaming": "gaming",
                        "creative": "creator"}
DESKTOP_USE_AFFINITY = {
    "school": {"business": 5},
    "everyday": {"business": 5},
    "work": {"workstation": 12},
    "gaming": {"creator": 8, "workstation": 5},
    "creative": {"workstation": 12, "gaming": 6},
}
DESKTOP_CATEGORY_WHY = {
    "gaming": "A gaming desktop first — dedicated graphics for play",
    "creator": "Made for creative work — strong CPU/GPU for editing and rendering",
    "business": "A business desktop — built for workdays, calls, and documents",
    "everyday": "An everyday desktop for web, email, streaming, and documents",
    "workstation": "A workstation — certified muscle for pro apps, CAD, and heavy compute",
}


@app.route("/api/recommend-desktops", methods=["POST"])
def api_recommend_desktops():
    """
    Desktop picks. POST JSON:
      {use, os, case, budget, snapdragon, usage, kid, ecosystem}
    use: school|everyday|work|gaming|creative
    os: windows|mac|chromebook|any
    case: mini|sff|tower|full|aio|any — CASE SIZE (the desktop fork of the
      size question; matched on the census form-factor classes, tower
      covers mini-tower + mid-tower)
    budget: under500|500-900|900-1400|1400plus|any  (matched on starting price)
    snapdragon: no|yes|unsure — same compatibility question as laptops.
      There are no Snapdragon desktops in the catalog (that lane is
      laptop-only today), so every Windows pick is Intel/AMD.
    usage: light|heavy — browser+documents vs big apps+lots of files.
    kid: yes|no — yes adds parental-control setup guidance per platform.
    ecosystem: {wants, phone, tv, watch} — same-brand boost, reason shown.
    Returns ranked top-10 with price ranges, why lists, setup guides.
    """
    a = request.get_json(force=True, silent=True) or {}
    use = a.get("use", "everyday")
    os_pref = a.get("os", "any")
    case = a.get("case", "any")
    budget = a.get("budget", "any")
    snap_answer = a.get("snapdragon", "unsure")
    usage = a.get("usage", "light")
    kid = a.get("kid", "no") == "yes"
    eco = a.get("ecosystem") or {}
    eco_wants = bool(eco.get("wants"))
    eco_owned = {k: (eco.get(k) or "").strip() for k in ("phone", "tv", "watch")}
    notes = []

    pool = list(DESKTOPS)
    # Hard filter: platform
    platform = DESKTOP_PLATFORM_OF.get(os_pref)
    if platform:
        pool = [d for d in pool if d["platform"] == platform]
    # Hard filters with graceful relaxation: case size, then budget
    if case != "any":
        in_case = [d for d in pool if d["case_bucket"] == case]
        if len(in_case) >= 3:
            pool = in_case
    if budget != "any":
        in_budget = [d for d in pool if _laptop_in_budget(d["price"], budget)]
        if len(in_budget) >= 3:
            pool = in_budget
    # Ecosystem honesty notes (brand-level facts only) — same as laptops
    phone_b, watch_b = eco_owned.get("phone", ""), eco_owned.get("watch", "")
    if eco_wants and watch_b.lower() == "apple" and phone_b and phone_b.lower() != "apple":
        notes.append("An Apple Watch only pairs with an iPhone — it won't "
                     "connect to a " + phone_b + " phone, whichever desktop you pick.")
    if eco_wants and watch_b.lower() == "samsung" and phone_b and phone_b.lower() != "samsung":
        notes.append("A Galaxy Watch works with other Android phones, but a "
                     "few health features (like ECG) need a Samsung phone.")

    want_cat = DESKTOP_USE_CATEGORY.get(use, "everyday")
    affinity = DESKTOP_USE_AFFINITY.get(use, {})

    def score(d):
        s, why_bits = 50.0, []
        if d["desktop_category"] == want_cat:
            s += 40
            why_bits.append(DESKTOP_CATEGORY_WHY[want_cat])
        elif d["desktop_category"] in affinity:
            s += affinity[d["desktop_category"]]
            why_bits.append(DESKTOP_CATEGORY_WHY[d["desktop_category"]])
        if case != "any" and d["case_bucket"] == case:
            s += 12
        if usage == "heavy":
            if d["ram_max_gb"] and d["ram_max_gb"] >= 16:
                s += 8
            if d["storage_max_gb"] and d["storage_max_gb"] >= 512:
                s += 8
        if use in ("gaming", "creative") and d["gpu_type"] in ("discrete", "both"):
            s += 8
        eco_note = None
        if eco_wants:
            matched = []
            if phone_b and d["brand"].lower() == phone_b.lower():
                s += 25
                matched.append("phone")
            if eco_owned["tv"] and d["brand"].lower() == eco_owned["tv"].lower():
                s += 10
                matched.append("TV")
            if watch_b and d["brand"].lower() == watch_b.lower():
                s += 10
                matched.append("smartwatch")
            if matched:
                eco_note = (f"Same brand as your {' and '.join(matched)} "
                            f"({d['brand']}) — one ecosystem: account, apps, "
                            "and device perks line up best inside one brand's world.")
        return s, why_bits, eco_note

    budget_label = {"under500": "under $500", "500-900": "$500–$900",
                    "900-1400": "$900–$1,400",
                    "1400plus": "over $1,400"}.get(budget)
    case_label = DESKTOP_CASE_LABEL.get(case)

    def why_list_for(d, eco_note):
        """Per-pick reasons for the 'Why we picked this desktop' dropdown.
        Every bullet traces to a quiz answer or a data field — no filler."""
        bullets = []
        cat = d["desktop_category"]
        frag = DESKTOP_CATEGORY_WHY.get(cat, "")
        if frag and cat == want_cat:
            bullets.append(f"For {use}: {frag[0].lower() + frag[1:]}.")
        elif frag and cat in affinity:
            bullets.append(f"Close match for {use}: {frag[0].lower() + frag[1:]}.")
        if os_pref != "any":
            bullets.append(f"Runs {d['platform']} — the system you asked for.")
        if case != "any" and case_label:
            if d["case_bucket"] == case:
                bullets.append(f"{d['form_factor_label']} case — the size "
                               f"you picked.")
            else:
                bullets.append(
                    f"{d['form_factor_label']} case — outside the "
                    f"{case_label} size you picked; we widened the net "
                    "because few desktops matched everything you asked for.")
        if budget != "any" and budget_label:
            price = d["price"]
            if _laptop_in_budget(price, budget):
                spot = ""
                spans = {"under500": (0, 500), "500-900": (500, 900),
                         "900-1400": (900, 1400)}
                if budget in spans:
                    lo, hi = spans[budget]
                    r = (price - lo) / (hi - lo)
                    spot = (" — near the low end of that budget" if r <= 0.34
                            else " — near the top of that budget" if r >= 0.67
                            else " — mid-range in that budget")
                bullets.append(f"Starts at {_fmt_price(price)} — inside your "
                               f"{budget_label} budget{spot}.")
            else:
                bullets.append(
                    f"Starts at {_fmt_price(price)} — outside your "
                    f"{budget_label} budget; it stayed in because few "
                    "desktops matched your other answers.")
        if usage == "heavy":
            strong = []
            if d["ram_max_gb"] and d["ram_max_gb"] >= 16:
                strong.append(f"up to {d['ram_max_gb']}GB RAM")
            if d["storage_max_gb"] and d["storage_max_gb"] >= 512:
                strong.append(f"up to {d['storage_max_gb']}GB storage")
            if strong:
                bullets.append("Headroom for big apps and lots of files: "
                               "configures " + " and ".join(strong) + ".")
        elif d["ram_min_gb"]:
            b = f"Starts at {d['ram_min_gb']}GB RAM"
            if d["storage_min_gb"]:
                b += f" and {d['storage_min_gb']}GB storage"
            bullets.append(b + " — plenty for browser, email, "
                           "and document work.")
        if d["platform"] == "Windows" and snap_answer in ("yes", "unsure") \
                and not d["snapdragon"] and d["architecture"] == "x86":
            bullets.append(
                "Intel/AMD inside — the compatibility-safe lane for "
                "specific Windows programs, older printers, and "
                "anti-cheat games. (Snapdragon desktops don't exist yet — "
                "that lane is laptops-only today.)")
        if use in ("gaming", "creative"):
            if d["gpu_type"] == "discrete":
                bullets.append("Dedicated graphics on board — the kind "
                               "games and creative apps are built for.")
            elif d["gpu_type"] == "both":
                bullets.append("Can be configured with dedicated graphics — "
                               "the kind games and creative apps are built for.")
        if d["form_factor"] == "all-in-one" and d["display_inches"]:
            bullets.append(f"All-in-one: the {d['display_inches']}″ screen "
                           "is built in — no separate monitor to buy.")
        if eco_note:
            bullets.append(eco_note)
        if d.get("formerly"):
            bullets.append(f"Rebrand note: this is {d['brand']}'s successor "
                           f"to the {d['formerly']} — same family, "
                           "new name.")
        if d.get("price_note"):
            bullets.append(d["price_note"])
        if kid:
            par = LAPTOP_PARENTAL.get("platforms", {}).get(
                LAPTOP_OS_KEY.get(d["platform"], "")) or {}
            cs = par.get("control_system")
            if cs:
                bullets.append(
                    f"For your kid: {d['platform']} parental controls run "
                    f"through {cs} — the setup page (button at the bottom "
                    "of these results) walks through the child account, "
                    "limits, and approvals.")
            else:
                bullets.append(
                    "For your kid: this platform has built-in parental "
                    "controls — the setup page (button at the bottom of "
                    "these results) walks through them.")
        return bullets

    scored = []
    for d in pool:
        s, why_bits, eco_note = score(d)
        why = ". ".join(why_bits) + "." if why_bits else "A solid all-rounder."
        if usage == "heavy" and d["ram_max_gb"]:
            why += (f" Specs go up to {d['ram_max_gb']}GB RAM"
                    + (f" and {d['storage_max_gb']}GB storage"
                       if d["storage_max_gb"] else "") + ".")
        scored.append((s, d, why, eco_note))
    scored.sort(key=lambda t: (-t[0], t[1]["price"]))

    # Brand diversity: cap 3 per brand in the first pass, then backfill
    ranked, deferred, per_brand = [], [], {}
    for item in scored:
        b = item[1]["brand"]
        if per_brand.get(b, 0) < 3:
            ranked.append(item)
            per_brand[b] = per_brand.get(b, 0) + 1
        else:
            deferred.append(item)
    ranked = (ranked + deferred)[:10]

    recs, os_keys, brand_keys = [], set(), set()
    for s, d, why, eco_note in ranked:
        os_key = LAPTOP_OS_KEY.get(d["platform"])
        brand_key = d["brand"].lower()
        if os_key:
            os_keys.add(os_key)
        brand_keys.add(brand_key)
        recs.append({
            "id": d["id"], "name": d["name"], "brand": d["brand"],
            "type": "desktop", "desktop_category": d["desktop_category"],
            "platform": d["platform"], "os_detail": d["os_detail"],
            "form_factor": d["form_factor"],
            "form_factor_label": d["form_factor_label"],
            "case_bucket": d["case_bucket"],
            "model_number": d["model_number"],
            "display_inches": d["display_inches"],
            "cpu": d["cpu"], "ram_text": d["ram_text"],
            "storage_text": d["storage_text"], "gpu": d["gpu"],
            "gpu_type": d["gpu_type"],
            "dimensions": d["dimensions"],
            "volume_liters": d["volume_liters"],
            "weight_text": d["weight_text"],
            "architecture": d["architecture"], "snapdragon": d["snapdragon"],
            "formerly": d["formerly"], "source_url": d["source_url"],
            "price": d["price"], "price_max": d["price_max"],
            "price_source": d["price_source"],
            "max_config_note": d["max_config_note"],
            "price_note": d["price_note"],
            "score": round(s), "why": why_list_for(d, eco_note),
            "summary": why, "ecosystem_note": eco_note,
            "setup": {"os_key": os_key, "brand_key": brand_key},
        })
    if any(r["platform"] == "DGX OS" for r in recs):
        notes.append(
            "One pick runs NVIDIA DGX OS — a specialist AI-compute system "
            "for local model work, not a general-purpose Windows/Mac "
            "machine. It's in the catalog for exactly that job.")

    # Setup guidance for exactly the platforms/brands in these results
    guides = {"os_flows": {}, "brand_layers": {},
              "first_week_checklist": [], "parental": None}
    for k in os_keys:
        if k in LAPTOP_GUIDES.get("os_flows", {}):
            guides["os_flows"][k] = LAPTOP_GUIDES["os_flows"][k]
    for k in brand_keys:
        if k in LAPTOP_GUIDES.get("brand_layers", {}):
            guides["brand_layers"][k] = LAPTOP_GUIDES["brand_layers"][k]
    plat_tokens = set()
    for r in recs:
        ok = LAPTOP_OS_KEY.get(r["platform"])
        if ok:
            plat_tokens |= {"windows_11": {"windows", "all"},
                            "macos": {"macos", "mac", "all"},
                            "chromeos": {"chromeos", "chrome", "all"}}[ok]
    for c in LAPTOP_GUIDES.get("first_week_checklist", []):
        if str(c.get("applies_to", "all")).lower() in plat_tokens:
            guides["first_week_checklist"].append(c)
    if kid:
        guides["parental"] = {
            "core_principle": LAPTOP_PARENTAL.get("core_principle"),
            "platforms": {k: LAPTOP_PARENTAL.get("platforms", {}).get(k)
                          for k in os_keys
                          if LAPTOP_PARENTAL.get("platforms", {}).get(k)},
        }

    return jsonify({
        "recommendations": recs,
        "notes": notes,
        "guides": guides,
        "kid": kid,
        "query": {"use": use, "os": os_pref, "case": case,
                  "budget": budget, "snapdragon": snap_answer,
                  "usage": usage},
    })


def _squash(s):
    """Lowercase, alphanumerics only — for forgiving model matching."""
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _word_tokens(s):
    return re.findall(r"[a-z0-9]+", (s or "").lower())


def _laptop_public(l):
    """The fields the result cards use, for a directly-looked-up model.
    The summary is built from data facts only (category + spec ceiling) —
    no quiz-based reasons are invented for a model the user named."""
    frag = LAPTOP_CATEGORY_WHY.get(l["laptop_category"], "")
    summary = (frag + ".") if frag else "A solid all-rounder."
    if l["ram_max_gb"]:
        summary += (f" Specs go up to {l['ram_max_gb']}GB RAM"
                    + (f" and {l['storage_max_gb']}GB storage"
                       if l["storage_max_gb"] else "") + ".")
    return {
        "id": l["id"], "name": l["name"], "brand": l["brand"],
        "type": "laptop", "laptop_category": l["laptop_category"],
        "platform": l["platform"], "display_inches": l["display_inches"],
        "cpu": l["cpu"], "ram_text": l["ram_text"],
        "storage_text": l["storage_text"], "gpu": l["gpu"],
        "weight_text": l["weight_text"],
        "architecture": l["architecture"], "snapdragon": l["snapdragon"],
        "formerly": l["formerly"], "source_url": l["source_url"],
        "price": l["price"], "price_max": l["price_max"],
        "price_source": l["price_source"],
        "max_config_note": l["max_config_note"],
        "score": 0, "why": [], "summary": summary, "ecosystem_note": None,
        "cpu_check": bool(l["snapdragon"] and l["architecture"] == "both"),
        "setup": {"os_key": LAPTOP_OS_KEY[l["platform"]],
                  "brand_key": l["brand"].lower()},
    }


def _desktop_public(d):
    """The fields the result cards use, for a directly-looked-up desktop.
    Facts only (category + case + spec ceiling) — no quiz-based reasons
    are invented for a model the user named."""
    frag = DESKTOP_CATEGORY_WHY.get(d["desktop_category"], "")
    summary = (frag + ".") if frag else "A solid all-rounder."
    summary += f" {d['form_factor_label']} case."
    if d["ram_max_gb"]:
        summary += (f" Specs go up to {d['ram_max_gb']}GB RAM"
                    + (f" and {d['storage_max_gb']}GB storage"
                       if d["storage_max_gb"] else "") + ".")
    return {
        "id": d["id"], "name": d["name"], "brand": d["brand"],
        "type": "desktop", "desktop_category": d["desktop_category"],
        "platform": d["platform"], "os_detail": d["os_detail"],
        "form_factor": d["form_factor"],
        "form_factor_label": d["form_factor_label"],
        "case_bucket": d["case_bucket"],
        "model_number": d["model_number"],
        "display_inches": d["display_inches"],
        "cpu": d["cpu"], "ram_text": d["ram_text"],
        "storage_text": d["storage_text"], "gpu": d["gpu"],
        "gpu_type": d["gpu_type"], "dimensions": d["dimensions"],
        "volume_liters": d["volume_liters"],
        "weight_text": d["weight_text"],
        "architecture": d["architecture"], "snapdragon": d["snapdragon"],
        "formerly": d["formerly"], "source_url": d["source_url"],
        "price": d["price"], "price_max": d["price_max"],
        "price_source": d["price_source"],
        "max_config_note": d["max_config_note"],
        "price_note": d["price_note"],
        "score": 0, "why": [], "summary": summary, "ecosystem_note": None,
        "setup": {"os_key": LAPTOP_OS_KEY.get(d["platform"]),
                  "brand_key": d["brand"].lower()},
    }


@app.route("/api/laptop-search")
def api_laptop_search():
    """'Know your model?' lookup (route name kept from the laptop launch).
    GET ?q= — matches the typed text against model names, the old line
    names (formerly: a user typing 'Inspiron' finds the renamed Dell
    lines), and model-number codes. Searches BOTH catalogs: laptops
    (codes matched from name tokens — the laptop data has no dedicated
    model-number field) and desktops (codes matched from names AND the
    census model_number field, e.g. EBT2250). Each match carries its
    type: 'laptop' or 'desktop'."""
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        return jsonify({"matches": []})
    qs = _squash(q)
    qtoks = _word_tokens(q)
    hits = []
    for l in LAPTOPS:
        name_s = _squash(l["name"])
        form_s = _squash(l.get("formerly") or "")
        name_toks = _word_tokens(l["name"])
        all_toks = set(name_toks) | set(_word_tokens(l.get("formerly") or "")) \
            | set(_word_tokens(l["brand"]))
        if qs and qs in name_toks:
            tier = 0          # exact model-code token: CX34, B14W, DB04250
        elif qs and qs in name_s:
            tier = 1          # typed name (or part of it), squashed
        elif qtoks and all(any(t in tok for tok in all_toks) for t in qtoks):
            tier = 2          # every typed word matches somewhere in the name
        elif qs and qs in form_s:
            tier = 3          # the old line name (formerly)
        else:
            continue
        hits.append((tier, l["price"], _laptop_public(l)))
    for d in DESKTOPS:
        name_s = _squash(d["name"])
        form_s = _squash(d.get("formerly") or "")
        code_s = _squash(d.get("model_number") or "")
        name_toks = _word_tokens(d["name"])
        code_toks = _word_tokens(d.get("model_number") or "")
        all_toks = set(name_toks) | set(code_toks) \
            | set(_word_tokens(d.get("formerly") or "")) \
            | set(_word_tokens(d["brand"]))
        if qs and (qs in name_toks or qs in code_toks or qs == code_s):
            tier = 0          # exact model-code token: EBT2250, PN42, 90YA…
        elif qs and qs in name_s:
            tier = 1
        elif qtoks and all(any(t in tok for tok in all_toks) for t in qtoks):
            tier = 2
        elif qs and qs in form_s:
            tier = 3
        else:
            continue
        hits.append((tier, d["price"], _desktop_public(d)))
    hits.sort(key=lambda t: (t[0], t[1]))
    return jsonify({"matches": [pub for _, _, pub in hits[:8]]})


@app.route("/api/laptop-guides")
def api_laptop_guides():
    """Full laptop setup-guide library: OS first-boot flows, per-brand
    setup layers, the first-week checklist, and parental controls per
    platform (the 'Setting up for a kid' path). Powers the frontend's
    Set Up -> PC browser; also here for other AIs to read."""
    return jsonify({
        "setup_guides": LAPTOP_GUIDES,
        "parental_controls": LAPTOP_PARENTAL,
    })


# ---------------------------------------------------------------- why-strings
def _why_modem(e, isp, speed):
    bits = [f"Certified for {isp['name']}"]
    if e.get("docsis") == "3.1":
        bits.append("DOCSIS 3.1 handles your speed tier with headroom")
    else:
        bits.append("plenty for plans under 600 Mbps")
    return ". ".join(bits) + "."

def _why_combo(e, isp, speed):
    return (f"One box replaces your {isp['name']} rental — modem and router together. "
            "Easiest setup of the bunch.")

def _why_router(e, coverage, with_combo):
    if e["type"] == "mesh":
        reason = ", ".join(coverage) if coverage else "your layout"
        return (f"Mesh system wipes out dead zones — the right call for "
                f"{reason}. Tradeoff: more boxes to place, plug in, and manage "
                f"than a single router.")
    return ("Strong all-rounder with modern WiFi 6. More control than any "
            "ISP rental.")


# ---------------------------------------------------------------- frontend
@app.route("/")
def index():
    return send_from_directory(BASE, "index.html")


def _step(title, body, t):
    # video_id is a placeholder until real walkthrough videos are picked
    return {"title": title, "body": body,
            "video_id": "REPLACE_ME", "video_start": t}

BASIC_STEPS_SEPARATE = [
    _step("Return the rental",
          "Box up your ISP's rental modem and take it to their store — or ship it with their return label. GET A RECEIPT. The rental fee keeps billing until they scan it back in. This is the step that actually saves you money.", 0),
    _step("Wire up the modem",
          "Screw the coax cable into your new modem, plug in power, and wait 5–10 minutes until the lights go solid (not blinking).", 60),
    _step("Activate it with your ISP",
          "Use the Online or Call tab above. Have your account number and the modem's MAC address (sticker on the bottom) ready.", 120),
    _step("Wire up the router",
          "Run an Ethernet cable from the modem to the router's WAN/Internet port (usually yellow or labeled). Power the router on and wait ~2 minutes.", 180),
    _step("Name your WiFi",
          "Open the router's app or web page and set your own network name and a strong password. Don't keep the default from the sticker.", 240),
    _step("Reconnect everything",
          "Join your phones, TVs, and laptops to the new network. Run a speed test (fast.com) to confirm you're getting what you pay for.", 300),
]
BASIC_STEPS_COMBO = [
    _step("Return the rental",
          "Box up your ISP's rental modem and take it to their store — or ship it with their return label. GET A RECEIPT. The rental fee keeps billing until they scan it back in. This is the step that actually saves you money.", 0),
    _step("Wire up the box",
          "Screw the coax cable into your all-in-one box, plug in power, and wait 5–10 minutes until the lights go solid (not blinking).", 60),
    _step("Activate it with your ISP",
          "Use the Online or Call tab above. Have your account number and the box's MAC address (sticker on the bottom) ready.", 120),
    _step("Name your WiFi",
          "Open the box's app or web page and set your own network name and a strong password. Don't keep the default from the sticker.", 180),
    _step("Reconnect everything",
          "Join your phones, TVs, and laptops to the new network. Run a speed test (fast.com) to confirm you're getting what you pay for.", 240),
]
ADVANCED_STEPS = [
    _step("Do the basic setup first",
          "Get online with the steps above, then come back here.", 0),
    _step("Change the admin password",
          "The router's settings page has its own login (often admin/password). Change it — that's separate from your WiFi password.", 45),
    _step("Update the firmware",
          "Check for firmware updates in the router settings. Old firmware is the #1 cause of weird issues.", 90),
    _step("Set custom DNS",
          "Switch DNS to 1.1.1.1 and 1.0.0.1 (Cloudflare, fast and private) or 9.9.9.9 (Quad9, blocks malicious sites).", 150),
    _step("Set up a guest network",
          "Make a separate WiFi network for guests and smart-home gadgets. Keeps your main network cleaner and safer.", 210),
    _step("VPN",
          "For privacy: enable your router's VPN client with a provider you trust. For remote access to home: Tailscale is free and dead simple.", 270),
    _step("QoS for gaming/calls",
          "In router settings, turn on QoS and prioritize your gaming PC or work laptop so Netflix in the other room doesn't cause lag.", 330),
    _step("AT&T fiber note",
          "If you're on AT&T: put their gateway in IP Passthrough mode (in the gateway settings) so your router gets the real connection.", 390),
]

@app.route("/api/setup-guide/<isp_id>")
def api_setup_guide(isp_id):
    """Full setup walkthrough: activation (online or call) + basic/advanced tracks."""
    isp = ISPS.get(isp_id)
    if not isp:
        return jsonify({"error": "unknown ISP"}), 400
    guide = DB.get("setup_guides", {}).get(isp_id, {})
    gear = request.args.get("gear", "separate")
    basic = BASIC_STEPS_COMBO if gear == "combo" else BASIC_STEPS_SEPARATE
    return jsonify({
        "isp": isp["name"],
        "gear": gear,
        "activation": guide,
        "basic": basic,
        "advanced": ADVANCED_STEPS,
    })


if __name__ == "__main__":
    # PORT env var = hosting (Render/Railway/etc). Otherwise local desktop.
    port = int(os.environ.get("PORT", 5002))
    debug = os.environ.get("PORT") is None
    app.run(host="0.0.0.0", port=port, debug=debug)
