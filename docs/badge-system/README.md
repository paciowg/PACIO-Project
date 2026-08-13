# PACIO Badge Verification

This directory documents the public badge verification pieces used by the
PACIO Project website.

## Public Components

- `/verification/index.html` provides the public badge lookup page.
- `/assets/data/badges-public.json` contains sanitized public badge records.
- `/assets/js/badge-verification.js` performs client-side lookup by badge ID
  and filtering by event, year, badge category, and company name.
- `/assets/css/badge-verification.css` styles the verification page.
- `/schema/badges-public.schema.json` documents the public registry shape.
- `/.github/workflows/validate-badges.yml` validates public badge data changes.

## Private Components

Do not publish the private badge administration tracker, requester contact
information, eligibility evidence, internal reviewer notes, delivery logs, or
badge-generation credentials in this repository.

Badge generation should run from a private PACIO-controlled environment. Only
sanitized public verification records should be committed here. Generated badge
SVG files should remain in the private generation output and be delivered to
recipients as attachments.

Public registry updates should be staged only after the private generation
package has been reviewed. The private tooling uses a separate
`publish-reviewed` step to copy the reviewed `badges-public.json` into this
repository.

## Public Record Rules

Public badge records may confirm the badge ID, recipient display name, public
company name, key contributors, badge category, event ID, event name, event
date, status, replacement badge links, and last updated date.

Public badge records must not include specific implementation guides tested,
detailed test results, certification claims, conformance claims, endorsement
language, production-readiness claims, private contact information, or internal
review notes.

## Event Organization

Badge IDs are globally unique and stable in the format
`PACIO-BDG-YYYY-####`. Event grouping is handled separately with `eventId` in
the format `YYYY-MM-short-event-name`, for example
`2026-07-cms-connectathon`.

The verification page supports direct badge links such as
`/verification/?id=PACIO-BDG-2026-0002` and browsing filters for event, year,
category, and company name.

## Correction And Replacement Display

Participant request details stay private. The public registry may show only the
resulting public status:

- `Corrected` means the badge record was updated while keeping the same Badge
  ID.
- `Retired` or `Revoked` means the badge is no longer the active recognition
  record.
- `supersedesBadgeId` and `supersededByBadgeId` may be used to connect a public
  replacement badge with the older badge it replaced.
