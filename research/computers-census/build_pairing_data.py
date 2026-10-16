#!/usr/bin/env python3
"""Build pairing.json (app-root, served by app.py) from the pairing
research datasets in this folder:

  laptops-display-support.json  — per-laptop maker-stated external
                                  display counts / resolutions / ports
  laptops-dock-compat.json      — per-laptop dock_class + the DC15250
                                  chassis split + host-requirement gates
  docks.json                    — 33 docks + the 13-brand pairing_map
                                  (exactly 2 options per brand)
  monitors.json                 — the curated monitors shelf, by tier

Output: ../../pairing.json (minified — the GitHub connector has an
argument-size limit; re-expand with `python3 -m json.tool` to inspect).

Pairing rules baked in here (Caleb, 2026-10-15):
- A laptop pairs with its brand's 2 pairing_map options; Chromebooks
  pair via the 'Chromebook partners' entry (the only Works With
  Chromebook certified first-party dock route in the data).
- usbc_data_only_with_usba laptops NEVER get standard USB-C docks:
  only the USB-A DisplayLink route (StarTech DK30A2DH via USB-A,
  Kensington SD4750P via USB-A) from the docks catalog.
- unknown stays unknown: no pairings are emitted, except DC15250,
  whose configuration_split is carried through so the UI can ask the
  chassis question and resolve the class from the buyer's answer.
- Prices are copied only where the source record observed one;
  price-less docks/monitors keep price_usd = null. Nothing is
  estimated, ever.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
APP_ROOT = os.path.dirname(os.path.dirname(HERE))


def load(name):
    with open(os.path.join(HERE, name)) as f:
        return json.load(f)


display = load("laptops-display-support.json")
compat = load("laptops-dock-compat.json")["laptops"]
docks_doc = load("docks.json")
monitors_doc = load("monitors.json")

DOCKS_BY_NAME = {d["name"]: d for d in docks_doc["docks"]}
PAIRING_MAP = docks_doc["pairing_map"]


def cap(s, n):
    """Cap a prose field at a sentence boundary near n chars, so the
    served file stays comfortably pushable. The full text stays in
    the research files; the UI only needs the gist."""
    if not s or len(s) <= n:
        return s or ""
    cut = s[:n]
    end = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[:end + 1] if end > n // 2 else cut.rstrip()) + ""


def slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return re.sub(r"-+", "-", s)


def dock_option(o):
    """One pairing_map option, trimmed to what the UI renders."""
    return {
        "id": slug(o["dock"]),
        "name": o["dock"],
        "role": o["role"],
        "brand": o["brand"],
        "connection": o["connection"],
        "display_tech": o["display_tech"],
        "displaylink_capable": bool(o["displaylink_capable"]),
        "max_displays": o["max_displays"],
        "host_charging_w": o.get("host_charging_w"),
        "price_usd": o["price_usd"],
        "price_source": o["price_source"],
    }


def dock_record_option(name, role):
    """A full docks.json record reshaped to the option shape, for the
    routes the pairing_map doesn't cover (USB-A DisplayLink, and the
    global DisplayLink fallback list)."""
    d = DOCKS_BY_NAME[name]
    return {
        "id": slug(d["name"]),
        "name": d["name"],
        "role": role,
        "brand": d["brand"],
        "connection": d["connection"],
        "display_tech": d["display_tech"],
        "displaylink_capable": bool(d["displaylink_capable"]),
        "max_displays": d["max_displays"],
        "host_charging_w": d.get("host_charging_w"),
        "price_usd": d["price_usd"],
        "price_source": d["price_source"],
    }


# The only two USB-A-capable DisplayLink docks in the catalog — the
# route for data-only-USB-C laptops (per laptops-dock-compat guidance).
USBA_DL_NAMES = [
    "StarTech.com DK30A2DH Dual-4K 60Hz Laptop Docking Station - "
    "USB-C or USB-A (DisplayLink DL-6950)",
    "Kensington SD4750P USB-C & USB-A Dual 4K Hybrid Docking Station "
    "(K39105NA)",
]
USBA_DISPLAYLINK_OPTIONS = [dock_record_option(n, "usba_displaylink")
                            for n in USBA_DL_NAMES]

# Global DisplayLink fallback: the DL-capable docks with an observed
# price, cheapest first — shown when a brand's own pairings contain
# no DisplayLink option but the buyer needs screens past the
# laptop's native limit.
_dl_priced = []
for name in docks_doc["displaylink_capable_docks"]:
    o = dock_record_option(name, "displaylink_fallback")
    if o["price_usd"] is not None:
        _dl_priced.append(o)
_dl_priced.sort(key=lambda o: o["price_usd"])
DISPLAYLINK_OPTIONS = _dl_priced[:3]

laptops_out = {}
for lid, rec in compat.items():
    disp = display.get(lid, {})
    cls = rec["dock_class"]
    entry = {
        "brand": rec["brand"],
        "platform": None,  # filled from the catalog record below
        "display_max_external": disp.get("max_external_displays"),
        "display_max_resolution": disp.get("max_external_resolution"),
        "display_ports": disp.get("ports_display"),
        "display_detail": cap(disp.get("display_support_detail"), 300),
        "dock_class": cls,
        "usbc_charging": rec.get("usbc_charging"),
        "pairing_key": None,
        "usba_displaylink_options": None,
        "chassis_split": None,
        "unknown_reason": None,
    }
    if cls == "usbc_data_only_with_usba":
        entry["usba_displaylink_options"] = USBA_DISPLAYLINK_OPTIONS
    elif cls == "unknown":
        entry["unknown_reason"] = cap(rec.get("unknown_reason"), 420)
        split = rec.get("configuration_split")
        if split:
            # DC15250: plastic -> data-only route, aluminum -> the
            # brand's standard pairings (a usbc_dp machine).
            entry["chassis_split"] = {
                "plastic": "usbc_data_only_with_usba",
                "aluminum": "usbc_dp",
            }
            entry["usba_displaylink_options"] = USBA_DISPLAYLINK_OPTIONS
    laptops_out[lid] = entry

# Brand pairing options live ONCE, keyed by pairing key — per-laptop
# copies would triple the file for nothing. The API joins them.
BRAND_OPTIONS = {key: [dock_option(o) for o in e["options"]]
                 for key, e in PAIRING_MAP.items()}

# Platforms + pairing keys need the catalog itself (equipment_db.json).
with open(os.path.join(APP_ROOT, "equipment_db.json")) as f:
    catalog = json.load(f)
for l in catalog["laptops"]:
    e = laptops_out.get(l["id"])
    if e is None:
        continue
    e["platform"] = l["platform"]
    if e["dock_class"] in ("thunderbolt", "usbc_dp") or e["chassis_split"]:
        e["pairing_key"] = "Chromebook partners" \
            if l["platform"] == "ChromeOS" else l["brand"]

def size_class_for(m):
    """Caleb's size bands (set 2026-10-16): aspect first — 21:9 or wider is
    'widescreen' at any inches. Otherwise under 27in = 'small', 27-32in =
    'office', over 32in = 'large'. Derived here so the shipped data always
    follows the rule even if monitors.json carries a stale class."""
    aspect = m.get("aspect") or ""
    try:
        w, h = aspect.split(":")
        if float(w) / float(h) > 1.9:
            return "widescreen"
    except (ValueError, ZeroDivisionError):
        pass
    size = m.get("size_in")
    if size is None:
        return m["size_class"]
    if size < 27:
        return "small"
    if size <= 32:
        return "office"
    return "large"


def size_label_for(m):
    """Buyer-facing size label for the small print beside a monitor's name
    (Caleb, 2026-10-16): widescreens say how many ordinary monitors wide
    they feel like — 21:9 is ~2 monitors wide; 32:9 is ~3."""
    cls = size_class_for(m)
    if cls == "widescreen":
        try:
            w, h = (m.get("aspect") or "").split(":")
            if float(w) / float(h) >= 3.0:
                return "Widescreen · super ultrawide, ~3 monitors wide"
        except (ValueError, ZeroDivisionError):
            pass
        return "Widescreen · ultrawide, ~2 monitors wide"
    return {"small": "Small · under 27\u2033",
            "office": "Office · 27\u201332\u2033",
            "large": "Large · over 32\u2033"}[cls]


def tech_for(panel):
    """Panel technology family for the shelf's technology filter (Caleb,
    2026-10-16): OLED / Mini-LED / IPS / VA / TN, from the maker's panel
    string. Falls back to the raw string so nothing is silently binned."""
    p = (panel or "").upper()
    if "OLED" in p:
        return "OLED"
    if "MINI" in p:
        return "Mini-LED"
    if "IPS" in p:
        return "IPS"
    if re.search(r"\bVA\b", p):
        return "VA"
    if re.search(r"\bTN\b", p):
        return "TN"
    return panel or "Unspecified"


monitors_out = {}
for tier, items in monitors_doc["tiers"].items():
    monitors_out[tier] = [{
        "id": slug(m["name"]),
        "name": m["name"],
        "brand": m["brand"],
        "size_in": m["size_in"],
        "size_class": size_class_for(m),
        "size_label": size_label_for(m),
        "tech": tech_for(m["panel_type"]),
        "resolution": m["resolution"],
        "quality_class": m["quality_class"],
        "role": m["role"],
        "why": m["why"],
        "price_usd": m["price_usd"],
        "price_source": (m.get("price_source") or {}).get("name"),
        "refresh_hz": m["refresh_hz"],
        "panel_type": m["panel_type"],
        "usbc_video_input": bool((m.get("inputs") or {})
                                 .get("usbc_video_input")),
    } for m in items]

out = {
    "meta": {
        "dataset": "ByteMatch pairing data (screens + docks)",
        "built_from": ["laptops-display-support.json",
                       "laptops-dock-compat.json", "docks.json",
                       "monitors.json"],
        "checked_date": "2026-10-15",
        "displaylink_options": DISPLAYLINK_OPTIONS,
    },
    "brand_options": BRAND_OPTIONS,
    "laptops": laptops_out,
    "monitors": monitors_out,
}

path = os.path.join(APP_ROOT, "pairing.json")
with open(path, "w") as f:
    json.dump(out, f, separators=(",", ":"), ensure_ascii=False)

n_opt = sum(1 for e in laptops_out.values() if e["pairing_key"])
n_usba = sum(1 for e in laptops_out.values()
             if e["usba_displaylink_options"])
n_mon = sum(len(v) for v in monitors_out.values())
print(f"wrote {path}: {os.path.getsize(path)} bytes; "
      f"{len(laptops_out)} laptops ({n_opt} with a brand pairing key, "
      f"{n_usba} with USB-A DisplayLink route); {n_mon} monitors; "
      f"{len(DISPLAYLINK_OPTIONS)} global DisplayLink fallbacks")
