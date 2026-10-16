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
# Pairing data (screens + docks), built from the research datasets by
# research/computers-census/build_pairing_data.py. Absent file = the
# pairing flow shows its honest "still being stocked" state.
PAIRING = {}
_pairing_path = os.path.join(BASE, "pairing.json")
if os.path.exists(_pairing_path):
    with open(_pairing_path) as f:
        PAIRING = json.load(f)

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
            "pairing_monitors": sum(len(v) for v in
                                    PAIRING.get("monitors", {}).values()),
            "pairing_laptops": len(PAIRING.get("laptops", {})),
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
            {"method": "GET", "path": "/api/computer/<laptop|desktop>/<id>",
             "description": "One catalog computer by id, in the public "
                            "result-card shape (with the Build .14 "
                            "compact spec summaries alongside the "
                            "verbatim spec text)."},
            {"method": "GET", "path": "/api/pairing-data",
             "description": "The full screen + dock pairing dataset: "
                            "per-brand dock pairings with stable ids, "
                            "and the curated monitors shelf by "
                            "resolution tier."},
            {"method": "GET", "path": "/api/pairing/<laptop|desktop>/<id>",
             "description": "Screen + dock pairing for one catalog "
                            "computer: the maker's stated external-"
                            "display support (null where unpublished), "
                            "the laptop's dock class and its two vetted "
                            "dock pairings (manufacturer + third party, "
                            "or two third parties), the USB-A DisplayLink "
                            "route for data-only-USB-C laptops, and the "
                            "curated monitors shelf by resolution tier."},
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
    ext_screens: 0|1|2 — external screens they'll plug in; ext_resolution:
      1080p|1440p|4k|unsure — the externals' resolution. Scored at CLASS
      level only: Apple chip classes have known native external counts
      (a shortfall surfaces the dock route, never a specific dock), and
      1440p+/multi-screen loads nudge the graphics class. No per-model
      port or max-resolution claims — the catalog doesn't hold them yet.
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
    ext_ans = str(a.get("ext_screens", "0"))
    ext_n = {"0": 0, "1": 1, "2": 2}.get(ext_ans, 0)
    ext_res = a.get("ext_resolution", "unsure")
    # Resolution pressure for laptops starts at 1440p; a 1080p external
    # (or an unsure answer) applies none.
    ext_req = (_display_requirement(ext_n, ext_res)
               if ext_n and ext_res != "1080p" else 0)
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
        if ext_n:
            native = _laptop_native_externals(l)
            if native is not None and ext_n > native:
                s -= 12
            if ext_req:
                g = _gpu_perf(l.get("gpu"), None)[0]
                if g is not None:
                    if g >= ext_req:
                        s += 6
                    else:
                        s -= min(12, 6 * -(-(ext_req - g) // 20))
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
        if ext_n:
            native = _laptop_native_externals(l)
            if native is not None and ext_n > native:
                # The class falls short of the ask natively — per
                # Caleb's design call, the answer is a dock pairing
                # (no specific dock named; that data pass comes later).
                bullets.append(
                    f"Drives {EXT_WORD[native]} on its own; a dock can "
                    "add the second on models with a dock-capable USB-C "
                    "or Thunderbolt port.")
            elif ext_req:
                g = _gpu_perf(l.get("gpu"), None)[0]
                ext_desc = (f"{ext_n} external {RES_LABEL[ext_res]} "
                            f"screen{'s' if ext_n > 1 else ''}")
                if g is not None and g >= ext_req:
                    bullets.append(f"Graphics class with headroom for "
                                   f"{ext_desc}.")
                elif g is not None:
                    bullets.append(
                        f"Graphics class is on the light side for "
                        f"{ext_desc} — everyday work is fine; heavy "
                        "gaming at that resolution would strain it.")
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
            **_spec_shorts(l),
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

    # If every pick whose class we can judge falls short of the external
    # screen count natively, say so once at results level (the dock
    # route is in the short picks' Why bullets). Unknown classes stay
    # silent — no claim either way.
    if ext_n and ranked:
        known = [n for n in (_laptop_native_externals(l)
                             for _, l, _, _ in ranked) if n is not None]
        if known and max(known) < ext_n:
            notes.append(
                "That many external screens is past what these laptop "
                "classes drive on their own — where a pick falls short, "
                "its Why notes the dock route that can add the rest, on "
                "models with a dock-capable USB-C or Thunderbolt port.")

    return jsonify({
        "recommendations": recs,
        "notes": notes,
        "guides": guides,
        "kid": kid,
        "filter_facts": {"two_in_one_available": two_in_one_available},
        "query": {"use": use, "os": os_pref, "screen": screen,
                  "budget": budget, "snapdragon": snap_answer,
                  "usage": usage, "ext_screens": ext_ans,
                  "ext_resolution": ext_res},
    })


# ------------------------------------------------- desktop perf signals
# Relative performance signals (0 = weakest in class, 100 = strongest) for
# the desktop results sort modes (Build 2026-10-15.11). Parsed ONLY from
# spec text the catalog actually carries (GPU/CPU strings, RAM ceilings);
# a field that can't be scored stays None — the sorter renormalizes over
# the signals a machine does have, never invents one. These are rough
# class-level signals for sorting, not benchmarks, and never shown as
# numbers to the buyer.
_GPU_TIERS = [
    (r"5090", 100), (r"rtx pro 6000|rtx 6000 ada", 98), (r"4090", 97),
    (r"5080", 94), (r"rtx pro 5000|rtx 5000 ada", 92), (r"4080", 90),
    (r"5070 ti", 89), (r"9070 xt", 88), (r"rtx pro 4000", 87),
    (r"gb10|grace blackwell", 86), (r"5070(?![0-9a-z])", 84),
    (r"9070(?! [0-9a-z])", 84), (r"9070 gre", 83), (r"5060 ti", 78),
    (r"rtx pro 2000|rtx 2000 ada", 70), (r"9060 xt", 71), (r"5060", 73),
    (r"w7600", 68), (r"4070", 76), (r"4060", 66), (r"5050", 64), (r"w7500", 60),
    (r"w7400", 54), (r"4050", 56), (r"3050 ti", 48), (r"3050", 43), (r"mx570", 40),
    (r"a1000", 38), (r"6400", 28), (r"a400", 26), (r"gt ?730|gt ?1030", 12),
]
_CPU_TIERS = [
    (r"9950x3d", 98), (r"m[456] ultra", 96), (r"9800x3d|9850x3d", 95),
    (r"285k|\b285\b", 94), (r"14900", 93), (r"9900x", 92),
    (r"7800x3d", 90), (r"270k plus|270k", 90), (r"ryzen 9", 90),
    (r"core i9", 88), (r"m[456] max", 86), (r"7700x3d", 85),
    (r"265k", 84), (r"9700x", 82), (r"265(?![0-9])", 82),
    (r"14700", 80), (r"ryzen ai 9", 80), (r"ultra 7", 78),
    (r"8000 hx", 78), (r"ryzen 7", 74), (r"m[456] pro", 74),
    (r"ryzen ai(?![0-9])|ryzen ai [34]00|ryzen ai [34]50", 72),
    (r"core i7", 72), (r"gb10|grace", 75), (r"m6(?![0-9a-z])", 70),
    (r"8700f", 68), (r"13620h|13420h", 66), (r"245k", 66),
    (r"155h", 62), (r"14500t?|14700t", 62), (r"ultra 5", 58),
    (r"9500f", 58), (r"258v", 58), (r"ryzen 5", 57), (r"m4(?![0-9a-z])", 56),
    (r"14400", 56), (r"8500g", 55), (r"core 7", 52), (r"\b32[25]\b", 50),
    (r"core 5", 45), (r"1334u|120u|150u", 44), (r"7430u", 42),
    (r"14100", 40), (r"core i3", 36), (r"ryzen 3", 34), (r"core 3", 32),
    (r"ryzen 200", 45), (r"n100|n200", 12),
    # Vague family-only strings (chassis/category listings that name no
    # model) get a conservative mid-family score, below every named tier.
    (r"core ultra", 62), (r"amd ryzen", 55), (r"intel core", 52),
]


def _tier_score(text, tiers):
    """Best (highest) tier matched in a spec string, else None."""
    if not text:
        return None
    t = text.lower()
    best = None
    for pat, sc in tiers:
        if re.search(pat, t):
            best = sc if best is None else max(best, sc)
    return best


def _gpu_perf(gpu_text, gpu_type):
    """(gpu score, vram_gb). Score from the GPU string's model names; the
    string describes options 'up to' a top card, so the best tier named
    is the machine's ceiling. Falls back to a mid/neutral class score
    from gpu_type when the string names no known model."""
    if not gpu_text:
        return None, None
    t = gpu_text.lower()
    vram = None
    gb = [int(x) for x in re.findall(r"(\d+)\s*gb", t)]
    if gb and ("gddr" in t or "geforce" in t or "radeon" in t or "rtx" in t):
        vram = max(gb)
    score = _tier_score(t, _GPU_TIERS)
    if score is None:
        cores = [int(x) for x in re.findall(r"(\d+)-core gpu", t)]
        if cores:  # Apple silicon: scale off the biggest GPU core count
            score = min(94, round(28 + max(cores) * 0.85))
    if score is None:
        if "arc 140" in t or "140v" in t or "140t" in t:
            score = 34
        elif "800m" in t:
            score = 33
        elif "arc" in t:
            score = 30
        elif "iris xe" in t:
            score = 24
        elif "uhd" in t:
            score = 15
    if score is None:
        score = {"discrete": 55, "both": 45,
                 "integrated": 18}.get(gpu_type or "")
    return score, vram


def _ram_perf(ram_max_gb, ram_min_gb):
    gb = ram_max_gb or ram_min_gb
    if not gb:
        return None
    import math
    return min(100, round(18 + 14 * math.log2(max(gb, 1) / 4.0)))


def _desktop_perf(d):
    gpu, vram = _gpu_perf(d.get("gpu"), d.get("gpu_type"))
    gpu_ai = gpu
    if gpu is not None and vram:
        vram_score = min(100, round(vram * 3.5))
        gpu_ai = round(0.7 * gpu + 0.3 * vram_score)
    return {"gpu": gpu, "gpu_ai": gpu_ai, "vram_gb": vram,
            "cpu": _tier_score(d.get("cpu"), _CPU_TIERS),
            "ram": _ram_perf(d.get("ram_max_gb"), d.get("ram_min_gb"))}


# ------------------------------------------------------- display demand
# Class-level screen math for the quiz's screens/resolution questions
# (Build 2026-10-15.12). We score the LOAD (screens × resolution)
# against a machine's graphics CLASS — never per-model port counts or
# per-model max resolutions, which the catalog doesn't hold yet.
RES_LOAD = {"1080p": 1.0, "1440p": 1.78, "4k": 4.0}
RES_LABEL = {"1080p": "1080p Full HD", "1440p": "1440p QHD",
             "4k": "4K Ultra HD"}
SCREEN_WORD = {1: "one screen", 2: "two screens", 3: "three screens"}
EXT_WORD = {1: "one external screen", 2: "two external screens"}


def _display_requirement(screens_n, resolution):
    """Minimum graphics-class score (the 0-100 scale of the perf
    signals) a machine should clear for this screen setup, from the
    total pixel load. 0 = no pressure applied (one standard screen,
    or the buyer isn't sure)."""
    if resolution not in RES_LOAD or screens_n <= 0:
        return 0
    load = screens_n * RES_LOAD[resolution]
    if load <= 1.0:
        return 0
    if load <= 2.0:
        return 30
    if load <= 4.0:
        return 55
    return 75


def _laptop_native_externals(l):
    """How many external displays this laptop's chip CLASS drives
    natively, where that is a known class fact — else None (unknown:
    no penalty, no claim, no dock line). Encoded class facts are
    Apple-silicon only, read off the chip named in the cpu field:
    base M1/M2/M3 → one external; base M4 → two; Pro class → two;
    Max class → four. (The MacBook Pro 'family' listings span up to
    Max, so they read at the family ceiling.) Windows/Chromebook
    classes are NOT asserted: typical current machines drive at least
    one external, but two-plus varies by model and the catalog holds
    no per-model port data yet — silence over invention."""
    if l["platform"] != "macOS":
        return None
    t = (l.get("cpu") or "").lower()
    m = re.search(r"\bm([1-9])\b", t)
    if not m:
        return None
    if "max" in t:
        return 4
    if "pro" in t:
        return 2
    return 1 if int(m.group(1)) <= 3 else 2


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
    screens: 1|2|3 — how many screens they'll plug in; resolution:
      1080p|1440p|4k|unsure — together they set a graphics-class bar
      (class-level signal only; soft boost/penalty, never a filter).
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
    screens_ans = str(a.get("screens", "1"))
    screens_n = {"1": 1, "2": 2, "3": 3}.get(screens_ans, 1)
    resolution = a.get("resolution", "unsure")
    req_gpu = _display_requirement(screens_n, resolution)
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
        if req_gpu:
            g = _desktop_perf(d)["gpu"]
            if g is not None:
                if g >= req_gpu:
                    s += 8
                else:
                    s -= min(18, 7 * -(-(req_gpu - g) // 20))
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
        if req_gpu:
            g = _desktop_perf(d)["gpu"]
            setup_desc = (f"{SCREEN_WORD[screens_n]} at "
                          f"{RES_LABEL[resolution]}")
            if g is not None and g >= req_gpu:
                bullets.append(f"Graphics class suited to driving "
                               f"{setup_desc}.")
            elif g is not None:
                bullets.append(
                    f"Graphics class is on the light side for {setup_desc} "
                    "— everyday work is fine; demanding games at that "
                    "resolution would want a stronger graphics class.")
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
            **_spec_shorts(d),
            "gpu_type": d["gpu_type"],
            "ram_min_gb": d["ram_min_gb"], "ram_max_gb": d["ram_max_gb"],
            # Sort-mode signals (Build .11): relative class scores parsed
            # from the spec fields above; None where a field can't be
            # scored. Internal sorting fuel — never displayed as numbers.
            "perf": _desktop_perf(d),
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
    if req_gpu and ranked and not any(
            (_desktop_perf(d)["gpu"] or 0) >= req_gpu for _, d, _, _ in ranked):
        notes.append(
            f"{SCREEN_WORD[screens_n].capitalize()} at "
            f"{RES_LABEL[resolution]} is a lot of pixels to push — no "
            "desktop in these picks fully clears that graphics bar, so "
            "we're showing the closest matches; the strongest graphics "
            "classes are ranked toward the top.")
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
                  "usage": usage, "screens": screens_ans,
                  "resolution": resolution},
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
        **_spec_shorts(l),
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
        **_spec_shorts(d),
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


@app.route("/api/pairing/<kind>/<mid>")
def api_pairing(kind, mid):
    """Screen + dock pairing for one catalog computer (Build .13).
    GET /api/pairing/laptop/<id> or /api/pairing/desktop/<id>.
    Everything here traces to a manufacturer statement or a vetted
    catalog record: display counts are the maker's published figures
    (null where the maker publishes none — never inferred), dock
    pairings come from the per-brand pairing map, and prices appear
    only where one was observed."""
    monitors = PAIRING.get("monitors", {})
    dl_options = PAIRING.get("meta", {}).get("displaylink_options", [])
    if kind == "laptop":
        rec = next((l for l in LAPTOPS if l["id"] == mid), None)
        entry = PAIRING.get("laptops", {}).get(mid)
        if rec is None or entry is None:
            return jsonify({"error": "unknown laptop id"}), 404
        options = None
        if entry.get("pairing_key"):
            options = PAIRING.get("brand_options", {}).get(
                entry["pairing_key"])
        return jsonify({
            "type": "laptop", "id": rec["id"], "name": rec["name"],
            "brand": rec["brand"], "platform": rec["platform"],
            "gpu": rec["gpu"],
            "display": {
                "max_external": entry["display_max_external"],
                "max_resolution": entry["display_max_resolution"],
                "ports": entry["display_ports"],
                "detail": entry["display_detail"],
            },
            "dock_class": entry["dock_class"],
            "usbc_charging": entry["usbc_charging"],
            "pairing_key": entry["pairing_key"],
            "pairing_options": options,
            "usba_displaylink_options":
                entry["usba_displaylink_options"],
            "chassis_split": entry["chassis_split"],
            "unknown_reason": entry["unknown_reason"],
            "displaylink_options": dl_options,
            "monitors": monitors,
        })
    if kind == "desktop":
        rec = next((d for d in DESKTOPS if d["id"] == mid), None)
        if rec is None:
            return jsonify({"error": "unknown desktop id"}), 404

        return jsonify({
            "type": "desktop", "id": rec["id"], "name": rec["name"],
            "brand": rec["brand"], "platform": rec["platform"],
            "gpu": rec["gpu"],
            "form_factor_label": rec["form_factor_label"],
            "display_inches": rec["display_inches"],
            "display": None, "dock_class": None,
            "pairing_options": None, "usba_displaylink_options": None,
            "chassis_split": None, "unknown_reason": None,
            "displaylink_options": [],
            "monitors": monitors,
        })
    return jsonify({"error": "kind must be laptop or desktop"}), 404


# ------------------------------------------------------------- spec summary
# Build 2026-10-15.14: result cards show compact spec chips instead of
# the catalog's verbose variant prose (Caleb: "16–64 GB of memory and
# so forth instead of the big blurb"). Data-driven and conservative:
# memory/storage ranges come from the census's structured min/max
# fields where they exist, else from capacities stated in the text;
# CPU/GPU headlines keep the maker's named processors and any stated
# core/VRAM span. A spec that can't be summarized safely falls back
# to the original text with parenthetical asides removed — numbers
# are never invented. The verbatim text still ships as cpu/ram_text/
# storage_text/gpu and the card discloses it in full.
import re as _re

_APPLE_CHIP_RE = _re.compile(r"Apple (M\d+(?: (?:Pro|Max|Ultra))?)")
_CORE_RE = _re.compile(r"(\d+)\s*-core")


def _fmt_capacity(gb):
    if gb is None:
        return None
    if gb >= 1000:
        # The two censuses recorded TB differently (1024-based in the
        # laptop data, 1000-based in the desktop data) — display the
        # whole-TB figure either convention actually means.
        for div in (1024, 1000):
            tb = gb / div
            if abs(tb - round(tb)) < 0.01:
                return f"{int(round(tb))} TB"
        return f"{gb / 1024.0:g} TB"
    return f"{int(gb)} GB" if float(gb).is_integer() else f"{gb:g} GB"


def _fmt_range(lo, hi, suffix=""):
    if lo is None:
        return None
    if hi and hi != lo:
        if lo < 1000 and hi < 1000:
            return f"{int(lo)}–{int(hi)} GB{suffix}"
        return f"{_fmt_capacity(lo)}–{_fmt_capacity(hi)}{suffix}"
    return f"{_fmt_capacity(lo)}{suffix}"


def _strip_asides(text):
    """Original text minus parenthetical asides, lightly cleaned."""
    if not text:
        return None
    t = _re.sub(r"\([^)]*\)", "", text)
    t = _re.sub(r",?\s*cTDP \d+\s*W", "", t)
    t = _re.sub(r"\s+options$", "", t.strip())
    t = _re.sub(r"\s+", " ", t)
    t = _re.sub(r"\s+([,;])", r"\1", t).strip(" ,;·")
    return t or None


def _truncate(text, limit=92):
    if not text or len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(" ,;/")
    return cut + "…"


def _text_capacities(text):
    """Capacities stated in prose ('16GB', '1TB'). Module combos like
    '2x8GB' are not totals and are removed before scanning."""
    if not text:
        return []
    t = _re.sub(r"\d+\s*[x×]\s*\d+\s*(GB|TB)", "", text, flags=_re.I)
    return [float(n) * (1000 if u.upper() == "TB" else 1)
            for n, u in _re.findall(r"(\d+(?:\.\d+)?)\s*(GB|TB)", t,
                                    flags=_re.I)]


def _core_range(text):
    nums = [int(n) for n in _CORE_RE.findall(text or "")]
    if not nums:
        return None
    lo, hi = min(nums), max(nums)
    return f"{lo}–{hi} cores" if hi != lo else f"{lo} cores"


def _apple_names(text):
    names = []
    for m in _APPLE_CHIP_RE.finditer(text or ""):
        if m.group(1) not in names:
            names.append(m.group(1))
    return names


def _ram_short(rec):
    text = rec.get("ram_text") or ""
    suffix = " unified memory" if "unified" in text.lower() else ""
    lo, hi = rec.get("ram_min_gb"), rec.get("ram_max_gb")
    if lo:
        return _fmt_range(lo, hi, suffix)
    caps = _text_capacities(text)
    if caps:
        return _fmt_range(min(caps), max(caps), suffix)
    return _strip_asides(text)


def _storage_short(rec):
    text = rec.get("storage_text") or ""
    suffix = " SSD" if ("SSD" in text and "HDD" not in text) else ""
    lo, hi = rec.get("storage_min_gb"), rec.get("storage_max_gb")
    if lo:
        return _fmt_range(lo, hi, suffix)
    caps = _text_capacities(text)
    if caps:
        return _fmt_range(min(caps), max(caps), suffix)
    return _strip_asides(text)


def _cpu_short(rec):
    text = rec.get("cpu") or ""
    if not text:
        return None
    chips = _apple_names(text)
    if chips:
        out = "Apple " + " / ".join(chips)
        cores = _core_range(text)
        return out + (f" · {cores}" if cores else "")
    t = _strip_asides(text)
    if t and len(t) > 68 and ";" in t:
        # Very long multi-part prose: the first segment is the headline
        # family statement; the rest stays in the full-specs disclosure.
        first = t.split(";")[0].strip()
        if len(first) >= 20:
            t = first
    if t and len(t) >= 8 and len(t) <= 68:
        return _re.sub(r"\s+[Pp]rocessor\b", "", t)
    # Long SKU lists collapse to family + tier numbers, when a single
    # family clearly dominates the string.
    fams = [("Intel Core Ultra", r"Ultra (\d)"), ("Intel Core", r"Core i(\d)"),
            ("AMD Ryzen", r"Ryzen (\d)")]
    present = [(name, pat) for name, pat in fams if name in text]
    if len(present) > 1:  # 'Intel Core' is a substring of the Ultra name
        present = [p for p in present if p[0] != "Intel Core"]
    if len(present) == 1:
        name, pat = present[0]
        tiers = sorted({int(x) for x in _re.findall(pat, text)})
        if len(tiers) >= 2:
            return f"{name} {' / '.join(str(x) for x in tiers)}"
    base = t if (t and len(t) >= 8) else text
    return _truncate(_re.sub(r"\s+[Pp]rocessor\b", "", base or ""))


def _gpu_short(rec):
    text = rec.get("gpu") or ""
    if not text:
        return None
    chips = _apple_names(text)
    if not chips and _CORE_RE.search(text):
        # e.g. a MacBook GPU field that reads "8-core GPU, configurable
        # to 10-core" — the chip family is named in the CPU field.
        chips = _apple_names(rec.get("cpu") or "")
    if chips:
        out = "Apple " + " / ".join(chips)
        cores = _core_range(text)
        return out + (f" · {cores}" if cores else "")
    t = _strip_asides(text)
    if t and len(t) <= 68:
        return t
    # Long discrete lists collapse to brand groups of model tokens.
    tokens = [(m.start(), m.group(1), m.group(2))
              for m in _re.finditer(r"\b(RTX|RX) (\d+(?: Ti| XT)?)", text)]
    if len(tokens) >= 2:
        groups, cur_brand, cur = [], None, []
        for pos, fam, model in tokens:
            before = text[:pos]
            brand = ("AMD" if fam == "RX" else "NVIDIA")
            if "AMD Radeon" in before and before.rfind("AMD Radeon") > \
                    before.rfind("NVIDIA"):
                brand = "AMD"
            elif "NVIDIA" in before and before.rfind("NVIDIA") > \
                    before.rfind("AMD Radeon"):
                brand = "NVIDIA"
            label = f"{brand} {'Radeon RX' if brand == 'AMD' else 'GeForce RTX'}"
            if label != cur_brand:
                if cur:
                    groups.append((cur_brand, cur))
                cur_brand, cur = label, [model]
            elif model not in cur:
                cur.append(model)
        if cur:
            groups.append((cur_brand, cur))
        out = " · ".join(f"{b} {' / '.join(ts)}" for b, ts in groups)
        vram = sorted({int(v) for v in
                       _re.findall(r"(\d+)\s*GB", text) if int(v) < 100})
        if len(vram) >= 2:
            out += f" · {vram[0]}–{vram[-1]} GB VRAM"
        elif vram:
            out += f" · {vram[0]} GB VRAM"
        return _truncate(out, 120)
    return _truncate(t or text)


def _spec_shorts(rec):
    return {"cpu_short": _cpu_short(rec), "gpu_short": _gpu_short(rec),
            "ram_short": _ram_short(rec),
            "storage_short": _storage_short(rec)}


@app.route("/api/computer/<kind>/<mid>")
def api_computer(kind, mid):
    """One catalog computer by id, in the same public shape the result
    cards use (Build .15: saved setups and shared setup links resolve
    their stored ids back to current catalog data through here)."""
    if kind == "laptop":
        rec = next((l for l in LAPTOPS if l["id"] == mid), None)
        if rec is None:
            return jsonify({"error": "unknown laptop id"}), 404
        return jsonify(_laptop_public(rec))
    if kind == "desktop":
        rec = next((d for d in DESKTOPS if d["id"] == mid), None)
        if rec is None:
            return jsonify({"error": "unknown desktop id"}), 404
        return jsonify(_desktop_public(rec))
    return jsonify({"error": "kind must be laptop or desktop"}), 404


@app.route("/api/pairing-data")
def api_pairing_data():
    """The full pairing dataset (docks + monitors shelf with stable
    ids), so saved setups can resolve dock/monitor ids to current
    names and prices (Build .15)."""
    if not PAIRING:
        return jsonify({"error": "pairing data unavailable"}), 404
    return jsonify(PAIRING)


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


# Split frontend assets (Build 2026-10-16.26): index.html is a slim shell;
# the CSS/JS live in assets/ and are referenced with ?v=<build stamp>, so a
# long cache is safe — every build bumps the stamp and the query together.
ASSET_FILES = {"site.css", "app-core.js", "app-computers.js",
               "app-guides.js", "app-pairing.js"}


@app.route("/assets/<name>")
def asset(name):
    if name not in ASSET_FILES:
        return ("Not found", 404)
    resp = send_from_directory(os.path.join(BASE, "assets"), name)
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


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
