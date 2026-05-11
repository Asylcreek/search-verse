# SearchVerse - Data Source Alternatives

**Date:** 2026-05-11
**Related:** [Design Specification](./2026-05-11-design.md) | [Technical Decisions](./2026-05-11-technical-decisions.md)

This document records every data source option investigated for Bible translation content, the findings for each, and why api.bible was selected. The primary constraint is that the product requires full verse text stored locally for cross-translation full-text search — runtime-only access is insufficient.

---

## The Core Constraint

The product needs to:

1. Store verse text locally in PostgreSQL to enable cross-translation full-text search in a single query
2. Serve the 7 target translations: KJV, AMP, AMPC, ERV, NLT, TPT, MSG
3. Include copyright attribution on every response

This rules out any source that prohibits offline storage or only provides a runtime search API per translation.

---

## Translation Copyright Status

Before evaluating sources, it is important to understand what we are dealing with:

| Translation | Rights Holder | Status |
|---|---|---|
| KJV | — | Public domain |
| AMP | The Lockman Foundation | Copyrighted |
| AMPC | The Lockman Foundation | Copyrighted |
| ERV | Bible League International | Copyrighted |
| NLT | Tyndale House Publishers | Copyrighted |
| TPT | Passion & Fire Ministries / BroadStreet Publishing | Copyrighted |
| MSG | NavPress / Tyndale House Publishers | Copyrighted |

Six of seven target translations are copyrighted. No source can legally provide them without publisher agreements.

---

## Sources Investigated

### 1. Self-hosting public domain translations only

**Sources considered:** `@helloao/cli` (AO Lab), `wldeh/bible-api` (GitHub), Bolls.life downloads, Project Gutenberg, Berean Standard Bible

**Findings:**
- KJV, ASV, WEB, BSB, YLT, Darby are freely self-hostable with no restrictions
- ERV, AMP, AMPC, NLT, TPT, MSG are not available through any public domain or Creative Commons source — they are actively enforced copyrights

**Verdict:** Covers KJV only from the target list. Five of six copyrighted translations have no free self-hosting path.

---

### 2. YouVersion Platform (platform.youversion.com)

**Findings:**
- YouVersion offers a developer platform with free Bible tools
- Has 3,500+ translations including all target translations
- Terms of Use contain a direct competition clause: *"use or exploit the YV IP to create or provide services that replicate or compete with YouVersion, the YouVersion Bible App, or YVP"*
- A Bible verse search website is precisely what YouVersion is — this clause blocks the use case entirely
- Even if the competition clause were navigable, the ToS states: *"We are not providing You rights in biblical works or works other than YV IP, which You must obtain from their respective owners and licensors"* — Bible text rights are not included

**Verdict:** Ruled out. Competition clause and no Bible text rights.

---

### 3. Tyndale NLT API (api.nlt.to)

**Findings:**
- Tyndale operates a dedicated NLT API, free for non-commercial use
- Has both passage retrieval and keyword search endpoints
- Free tier: 500 requests/day, 50 verses/request
- Output is HTML by default (not JSON)
- No confirmed caching or offline storage rights
- Covers NLT only — does not solve AMP, AMPC, ERV, TPT, MSG

**Verdict:** Viable for NLT as a runtime source only. Does not support offline storage. Insufficient alone.

---

### 4. Digital Bible Library (library.bible)

**Findings:**
- The DBL is the underlying licensing body behind api.bible, operated by United Bible Societies
- AMP, NLT, MSG, TPT are present as "Controlled access" translations
- Controlled access requires an organisation-level account and a license agreement with each publisher directly
- The DBL is not a developer API — it is an institutional licensing and distribution platform
- Publisher negotiations typically take months and require a formal organisation relationship

**Verdict:** Correct long-term path for full self-hosting rights, but not viable for MVP timelines. Revisit once the product has traction.

---

### 5. Bible Gateway API (biblegateway.com)

**Findings:**
- Bible Gateway offers a paid developer API with access to many licensed translations
- Terms prohibit local storage and bulk indexing — content must be rendered live from their API
- Suitable only for runtime access, not offline indexing
- Per-query pricing model adds ongoing costs tied to search volume

**Verdict:** Ruled out. Prohibits offline storage required for cross-translation indexing.

---

### 6. Bolls.life (bolls.life/api)

**Findings:**
- Allows full translation downloads as ZIP/JSON files
- Has a search API with keyword, case sensitivity, and Strong's number support
- Explicitly discourages scraping individual endpoints but permits full-download format
- Translation catalog includes many languages; does not prominently list AMP, NLT, TPT, MSG
- Individual contact required for licensed translation availability
- Operated by an individual (bpavlisinec@gmail.com) — uncertain long-term reliability

**Verdict:** Good option for public domain and some licensed translations, but does not have a clear path to the full target list. Reliability concern for a production product.

---

### 7. Direct publisher agreements

**Publishers contacted / researched:**

| Translation | Publisher | Findings |
|---|---|---|
| AMP / AMPC | The Lockman Foundation | Permission to Quote form for print/web up to 1,000 verses; no developer API; bulk/app licensing requires written agreement |
| NLT | Tyndale House Publishers | NLT API available (see above); bulk licensing via permissions@tyndale.com |
| MSG | NavPress / Tyndale | Up to 500 verses without permission; full app licensing via permissions@tyndale.com |
| TPT | BroadStreet Publishing | Up to 250 verses without permission; full licensing via tpt@broadstreetpublishing.com; removed from Bible Gateway in 2022 due to disputes |
| ERV | Bible League International | No public API; must contact directly |

**Verdict:** Viable long-term path, parallel to DBL membership. Each publisher agreement is independent, sequential, and takes months. Not viable as an MVP-blocking dependency.

---

## Why api.bible Was Chosen

**api.bible** (operated by American Bible Society) was selected as the data source for the following reasons:

### 1. Has all target translations

AMP, AMPC, NLT, and MSG are confirmed available. TPT and ERV require verification at sign-up but are expected to be in the catalog given ABS's publisher relationships with Lockman, Tyndale, and BroadStreet.

### 2. Centralized publisher licensing

api.bible has already negotiated access to copyrighted translations with publishers on behalf of developers. The Third Party IP agreement for each translation is a facilitated click-through process — not a separate months-long publisher negotiation.

### 3. Offline storage is permitted for licensed subscribers

Section 11 of the api.bible Terms and Conditions (Content Recency Requirements) reads: *"If you store API.Bible Content and/or Third Party IP Content offline..."* — this clause implicitly permits offline storage for active subscribers, subject to:
- Refreshing content at least every 30 days
- Deleting content within 24 hours if api.bible removes it
- Maintaining an active licensed subscription

Section 8's prohibition on "systematically extracting data to populate databases" targets unauthorized scraping, not licensed subscribers building a local index. Section 11's existence would be superfluous if offline storage were unconditionally prohibited.

### 4. Structured API for ingestion

The api.bible REST API (`/bibles/{bibleId}/books → chapters → verses`) provides a clean hierarchy for walking the full text of each translation programmatically. The data model maps directly.

### 5. Non-commercial free tier suitable for MVP scale

The Starter plan is free for non-commercial use, includes KJV (public domain) and up to 3 licensed translations. Additional licensed translations are $10/month each. For a church audience, the non-commercial designation applies and the cost is minimal.

---

## Known Risks and Mitigations

| Risk | Mitigation |
|---|---|
| api.bible terminates the account or removes a translation | Content must be removed within 72 hours per ToS. Design the refresh job to handle graceful removal. Accept dependency risk for MVP stage. |
| TPT or ERV not in api.bible catalog | Fall back to direct publisher outreach. These can be added incrementally after launch. |
| "Systematically extracting data" prohibition challenged | Section 11 is the explicit permission for offline storage. Keep an active paid subscription. Refresh on schedule. Do not extract beyond what is needed for the licensed translations. |
| api.bible pricing changes | Budget for $10/month per translation. At 7 translations, maximum cost is $70/month, well within ministry budget. |

---

## Future Path: Full Self-Hosting

When the product proves traction, the correct next step is DBL org membership + individual publisher agreements, which would grant full self-hosting rights outside of api.bible's terms. This path takes 3–6 months and is best pursued once there is a proven user base to justify the effort.
