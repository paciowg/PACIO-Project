#!/usr/bin/env python3
"""Validate the public PACIO badge registry before publication.

This script intentionally uses only the Python standard library so it can run in
GitHub Actions without dependency installation. It validates the sanitized
public registry, not the private badge administration tracker.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ROOT / "assets" / "data" / "badges-public.json"

REQUIRED_FIELDS = {
    "badgeId",
    "eventId",
    "status",
    "recipientDisplayName",
    "recipientType",
    "badgeCategory",
    "eventName",
    "eventDateRange",
    "verificationUrl",
    "lastUpdated",
}
OPTIONAL_FIELDS = {"companyName", "keyContributors", "supersedesBadgeId", "supersededByBadgeId", "publicNote"}
ALLOWED_FIELDS = REQUIRED_FIELDS | OPTIONAL_FIELDS
ALLOWED_STATUSES = {"Active", "Corrected", "Revoked", "Retired"}
ALLOWED_RECIPIENT_TYPES = {"Individual", "Team", "Organization"}
ALLOWED_CATEGORIES = {"Observer", "Contributor", "FHIR Implementer"}
BADGE_ID_PATTERN = re.compile(r"^PACIO-BDG-\d{4}-\d{4}$")
EVENT_ID_PATTERN = re.compile(r"^20\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PROHIBITED_PUBLIC_FIELDS = {
    "email",
    "phone",
    "contact",
    "requesterEmail",
    "requesterPhone",
    "reviewerNotes",
    "internalNotes",
    "eligibilityEvidence",
    "testResults",
    "specificIgsTested",
}
PROHIBITED_TEXT = [
    "certified",
    "certification",
    "conformance",
    "conformant",
    "endorsed",
    "endorsement",
    "production ready",
    "production-ready",
    "passed testing",
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_registry() -> list[dict]:
    try:
        data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Registry file not found: {REGISTRY_PATH}")
    except json.JSONDecodeError as exc:
        fail(f"Registry JSON is invalid: {exc}")

    if not isinstance(data, list):
        fail("Registry must be a JSON array.")
    return data


def validate_url(record: dict, index: int) -> None:
    badge_id = record["badgeId"]
    url = record["verificationUrl"]
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "pacioproject.org" or parsed.path != "/verification/":
        fail(f"Record {index}: verificationUrl must use https://pacioproject.org/verification/.")
    query_id = parse_qs(parsed.query).get("id", [None])[0]
    if query_id != badge_id:
        fail(f"Record {index}: verificationUrl id must match badgeId.")


def validate_public_text(record: dict, index: int) -> None:
    combined = " ".join(str(value).lower() for value in record.values())
    for phrase in PROHIBITED_TEXT:
        if phrase in combined:
            fail(f"Record {index}: prohibited claim language found: {phrase}")


def validate_record(record: object, index: int, seen_ids: set[str]) -> None:
    if not isinstance(record, dict):
        fail(f"Record {index}: each registry item must be an object.")

    unknown = set(record) - ALLOWED_FIELDS
    if unknown:
        fail(f"Record {index}: unknown public field(s): {', '.join(sorted(unknown))}")

    prohibited = set(record) & PROHIBITED_PUBLIC_FIELDS
    if prohibited:
        fail(f"Record {index}: prohibited private field(s): {', '.join(sorted(prohibited))}")

    missing = REQUIRED_FIELDS - set(record)
    if missing:
        fail(f"Record {index}: missing required field(s): {', '.join(sorted(missing))}")

    badge_id = record["badgeId"]
    if not isinstance(badge_id, str) or not BADGE_ID_PATTERN.match(badge_id):
        fail(f"Record {index}: badgeId must match PACIO-BDG-YYYY-####.")
    if badge_id in seen_ids:
        fail(f"Record {index}: duplicate badgeId: {badge_id}")
    seen_ids.add(badge_id)

    event_id = record["eventId"]
    if not isinstance(event_id, str) or not EVENT_ID_PATTERN.match(event_id):
        fail(f"Record {index}: eventId must match YYYY-MM-short-event-name.")

    if record["status"] not in ALLOWED_STATUSES:
        fail(f"Record {index}: invalid status: {record['status']}")
    if record["recipientType"] not in ALLOWED_RECIPIENT_TYPES:
        fail(f"Record {index}: invalid recipientType: {record['recipientType']}")
    if record["badgeCategory"] not in ALLOWED_CATEGORIES:
        fail(f"Record {index}: invalid badgeCategory: {record['badgeCategory']}")
    for field in ("supersedesBadgeId", "supersededByBadgeId"):
        related_badge_id = record.get(field, "")
        if related_badge_id:
            if not isinstance(related_badge_id, str) or not BADGE_ID_PATTERN.match(related_badge_id):
                fail(f"Record {index}: {field} must match PACIO-BDG-YYYY-####.")
            if related_badge_id == badge_id:
                fail(f"Record {index}: {field} must not match badgeId.")
    if not DATE_PATTERN.match(record["lastUpdated"]):
        fail(f"Record {index}: lastUpdated must use YYYY-MM-DD.")

    for field in REQUIRED_FIELDS:
        if not isinstance(record[field], str) or not record[field].strip():
            fail(f"Record {index}: {field} must be a non-empty string.")
    for field in OPTIONAL_FIELDS:
        if field in record and not isinstance(record[field], str):
            fail(f"Record {index}: {field} must be a string when provided.")
    for field in ("companyName", "keyContributors"):
        if EMAIL_PATTERN.search(str(record.get(field, ""))):
            fail(f"Record {index}: {field} must not include email addresses.")

    validate_url(record, index)
    validate_public_text(record, index)


def main() -> None:
    registry = load_registry()
    seen_ids: set[str] = set()
    for index, record in enumerate(registry, start=1):
        validate_record(record, index, seen_ids)
    print(f"Validated {len(registry)} public badge record(s).")


if __name__ == "__main__":
    main()
