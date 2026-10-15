"""
ModemMatch v1 — help people ditch ISP rental fees.
API-first design: the quiz engine is an API, so a future phone app
can call the same endpoints the web frontend uses.

Run:  pip install flask
      python app.py
Then open http://localhost:5002
"""
import json
import os
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__)
BASE = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(BASE, "equipment_db.json")) as f:
    DB = json.load(f)

ISPS = {i["id"]: i for i in DB["isps"]}
EQUIP = DB["equipment"]

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
