"""Generate realistic demo products and optionally send them to the shop API.

Preview only by default. Pass --apply to create products in the database used by
the running backend. The admin token is requested interactively and is never
saved in this file.
"""

from __future__ import annotations

import argparse
import getpass
import json
import random
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus
from urllib.request import Request, urlopen


# Each profile describes one kind of product. The generator combines a brand,
# model name, relevant features and a use case into a product record.
PRODUCT_PROFILES = [
    {
        "kind": "Wireless Headphones",
        "brands": ["Auralink", "Northstar Audio", "Echoform"],
        "series": ["Drift", "Studio", "Cloud"],
        "features": ["hybrid noise cancellation", "Bluetooth 5.3", "40-hour battery life", "USB-C fast charging"],
        "audience": "focused work, travel and everyday listening",
        "price_dollars": (79, 249),
    },
    {
        "kind": "Gaming Headset",
        "brands": ["Northstar Audio", "PixelForge", "Echoform"],
        "series": ["Arena", "Pulse", "Nova"],
        "features": ["spatial audio", "a detachable noise-reducing microphone", "memory-foam ear cushions", "multi-platform connectivity"],
        "audience": "long gaming sessions and team chat",
        "price_dollars": (49, 179),
    },
    {
        "kind": "USB Microphone",
        "brands": ["Clearwave", "Auralink", "PixelForge"],
        "series": ["Cast", "Signal", "Studio"],
        "features": ["cardioid voice capture", "tap-to-mute control", "USB-C plug-and-play setup", "a desktop stand"],
        "audience": "calls, streaming and home recording",
        "price_dollars": (39, 159),
    },
    {
        "kind": "Mechanical Keyboard",
        "brands": ["Keyhaven", "PixelForge", "Northstar"],
        "series": ["Tactile", "Compact", "Beacon"],
        "features": ["hot-swappable switches", "white backlighting", "a compact 75% layout", "USB-C connectivity"],
        "audience": "comfortable typing and gaming",
        "price_dollars": (59, 199),
    },
    {
        "kind": "Wireless Mouse",
        "brands": ["MotionLab", "Keyhaven", "PixelForge"],
        "series": ["Glide", "Vector", "Travel"],
        "features": ["an adjustable optical sensor", "quiet clicks", "Bluetooth and 2.4 GHz modes", "a rechargeable battery"],
        "audience": "precise work at a desk or on the go",
        "price_dollars": (24, 119),
    },
    {
        "kind": "27-inch Monitor",
        "brands": ["Viewpoint", "Northstar Display", "Clearview"],
        "series": ["Horizon", "Canvas", "Motion"],
        "features": ["1440p IPS resolution", "a 144 Hz refresh rate", "height-adjustable stand", "USB-C video input"],
        "audience": "productive home offices and smooth gaming",
        "price_dollars": (189, 499),
    },
    {
        "kind": "Laptop Computer",
        "brands": ["Northstar Systems", "Pinecone Tech", "Meridian"],
        "series": ["Aster", "Trail", "Studio"],
        "features": ["a 14-inch anti-glare display", "16 GB memory", "512 GB solid-state storage", "all-day battery life"],
        "audience": "study, office work and everyday tasks",
        "price_dollars": (599, 1499),
    },
    {
        "kind": "USB-C Hub",
        "brands": ["Portwell", "Meridian", "Linkcraft"],
        "series": ["Expand", "Bridge", "Travel"],
        "features": ["four USB ports", "4K HDMI output", "100 W pass-through charging", "a compact aluminum body"],
        "audience": "expanding a laptop workspace at home or away",
        "price_dollars": (29, 99),
    },
    {
        "kind": "Laptop Stand",
        "brands": ["Deskform", "Portwell", "Meridian"],
        "series": ["Lift", "Align", "Fold"],
        "features": ["six adjustable height positions", "a foldable aluminum frame", "non-slip silicone pads", "a ventilated support surface"],
        "audience": "a more comfortable and organized desk",
        "price_dollars": (25, 89),
    },
    {
        "kind": "Webcam",
        "brands": ["Clearwave", "Viewpoint", "Linkcraft"],
        "series": ["Focus", "Meet", "Studio"],
        "features": ["1080p video", "automatic light correction", "a privacy shutter", "a universal monitor clip"],
        "audience": "clear video calls and online classes",
        "price_dollars": (39, 149),
    },
    {
        "kind": "Desktop Speakers",
        "brands": ["Echoform", "Auralink", "Clearwave"],
        "series": ["Room", "Tone", "Field"],
        "features": ["stereo sound", "a front-mounted volume dial", "USB-C power", "a headphone output"],
        "audience": "music, calls and everyday desktop audio",
        "price_dollars": (45, 189),
    },
    {
        "kind": "USB-C Charging Cable",
        "brands": ["Linkcraft", "Portwell", "Deskform"],
        "series": ["Flex", "Core", "Braided"],
        "features": ["100 W power delivery", "a durable braided jacket", "a 2-meter length", "reinforced connectors"],
        "audience": "reliable charging at home or while traveling",
        "price_dollars": (9, 29),
    },
]


def placeholder_url(name: str) -> str:
    """Build a placehold.co image URL with the product name displayed on it."""
    return f"https://placehold.co/600x400/png?text={quote_plus(name, safe='')}"


def generate_products(count: int, seed: int | None = None) -> list[dict]:
    """Create product payloads using only Python's standard library."""
    rng = random.Random(seed)
    products = []
    serial_by_kind: dict[str, int] = {}

    for _ in range(count):
        profile = rng.choice(PRODUCT_PROFILES)
        serial_by_kind[profile["kind"]] = serial_by_kind.get(profile["kind"], 0) + 1

        brand = rng.choice(profile["brands"])
        series = rng.choice(profile["series"])
        serial = serial_by_kind[profile["kind"]]
        feature_one, feature_two = rng.sample(profile["features"], 2)
        price_dollars = rng.randint(*profile["price_dollars"])
        name = f"{brand} {series} {serial:03d} {profile['kind']}"

        products.append(
            {
                "name": name,
                "description": (
                    f"Designed for {profile['audience']}. "
                    f"Features {feature_one} and {feature_two}."
                ),
                "price_cents": price_dollars * 100,
                "image_url": placeholder_url(name),
                "stock_quantity": rng.randint(4, 40),
                "is_active": True,
            }
        )

    return products


def api_request(
    base_url: str,
    path: str,
    token: str | None = None,
    payload: dict | None = None,
    method: str | None = None,
):
    """Send one JSON request and return the decoded JSON response."""
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request_method = method or ("POST" if body is not None else "GET")
    request = Request(
        f"{base_url.rstrip('/')}{path}",
        data=body,
        headers=headers,
        method=request_method,
    )
    try:
        with urlopen(request, timeout=15) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body) if response_body else None
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {details}") from error
    except URLError as error:
        raise RuntimeError(f"Cannot reach the API: {error.reason}") from error


def existing_image_updates(base_url: str) -> list[dict]:
    """Build full-update payloads for active products needing a title placeholder."""
    products = api_request(base_url, "/products")
    stored_products = api_request(base_url, "/db/products")
    # /products reports available stock after reservations. PUT replaces the
    # product, so read stored stock separately to preserve the real quantity.
    stock_by_id = {product["id"]: product["stock_quantity"] for product in stored_products}
    updates = []

    for product in products:
        image_url = placeholder_url(product["name"])
        if product["image_url"] == image_url:
            continue
        updates.append(
            {
                "id": product["id"],
                "name": product["name"],
                "description": product["description"],
                "price_cents": product["price_cents"],
                "image_url": image_url,
                "stock_quantity": stock_by_id[product["id"]],
                "is_active": True,
            }
        )

    return updates


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate demo product data for QA Practice Shop.")
    parser.add_argument("--count", type=int, default=20, help="Number of products to generate (default: 20)")
    parser.add_argument("--seed", type=int, help="Optional seed to reproduce the same generated catalog")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Backend URL")
    parser.add_argument("--apply", action="store_true", help="Send products to the API; without this flag, only preview")
    parser.add_argument(
        "--refresh-existing-images",
        action="store_true",
        help="Also set title placeholders on active products already in the catalog",
    )
    args = parser.parse_args()

    if not 0 <= args.count <= 500:
        parser.error("--count must be between 0 and 500")
    if args.count == 0 and not args.refresh_existing_images:
        parser.error("use --refresh-existing-images when --count is 0")

    products = generate_products(args.count, args.seed)
    try:
        image_updates = existing_image_updates(args.base_url) if args.refresh_existing_images else []
    except (RuntimeError, KeyError, TypeError) as error:
        print(f"Could not prepare existing product updates: {error}", file=sys.stderr)
        return 1

    if not args.apply:
        print("Preview only — nothing has been changed.\n")
        print(f"New products to generate: {len(products)}")
        print(json.dumps(products, indent=2, ensure_ascii=False))
        if args.refresh_existing_images:
            print(f"\nExisting active products needing a placeholder: {len(image_updates)}")
            for product in image_updates:
                print(f"  #{product['id']} {product['name']} -> {product['image_url']}")
        print("\nAdd --apply to perform the changes.")
        return 0

    token = getpass.getpass("Paste the admin access token (input hidden): ").strip()
    if not token:
        print("No token provided; nothing was sent.", file=sys.stderr)
        return 2

    try:
        existing_products = api_request(args.base_url, "/products")
        existing_names = {item["name"] for item in existing_products}
        new_products = [item for item in products if item["name"] not in existing_names]
        skipped = len(products) - len(new_products)

        if not new_products:
            if image_updates:
                print(f"All {skipped} generated names already exist; {len(image_updates)} existing images still need updating.")
            else:
                print(f"All {skipped} generated product names already exist; nothing was added.")
                return 0

        created = 0
        print(
            f"This will create {len(new_products)} products and update "
            f"{len(image_updates)} existing product images."
        )
        if input("Type APPLY to continue: ") != "APPLY":
            print("Cancelled; no products were changed.")
            return 0

        for item in image_updates:
            product_id = item.pop("id")
            result = api_request(
                args.base_url,
                f"/products/{product_id}",
                token=token,
                payload=item,
                method="PUT",
            )
            print(f"Updated image for #{result['id']}: {result['name']}")

        for product in new_products:
            result = api_request(args.base_url, "/products", token=token, payload=product)
            print(f"Created #{result['id']}: {result['name']}")
            created += 1

        print(
            f"Done: created {created}; skipped existing names {skipped}; "
            f"updated existing images {len(image_updates)}."
        )
        return 0
    except (RuntimeError, KeyError, TypeError) as error:
        print(f"Stopped: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
