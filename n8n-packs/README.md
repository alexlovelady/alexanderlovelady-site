# n8n Packs

Twenty sellable n8n workflow packs, plus the generator, shared engine and tests that produce and check them. See `CATALOG.md` for the list, prices (test hypotheses) and credential needs.

## Layout

| Path | What |
|---|---|
| `CATALOG.md` | All 20 packs in one table, with how they were verified |
| `packs/<slug>/` | One sellable pack: `workflows/*.json`, `sheets/*.csv` (header rows), `sample-data/`, `README.md`, `LISTING.md` (generated) |
| `agency-client-onboarding/`, `cleaning-lead-to-booking/` | The first two packs (hand-built; same idea) |
| `engine/` | Shared Code-node logic: intake, event, sequence, digest, plus `engine/custom/` for Stripe, Shopify, AI drafting, RSS, newsletter and incidents |
| `packdefs/` | One spec file per pack: fields, message wording, timing, sheets. **Edit these, not the generated JSON.** |
| `build_packs.py`, `customflows.py`, `docs.py` | Generator: turns specs into workflows + docs, and validates every `{{placeholder}}` against real columns |
| `build.py` | Generator for the first two packs |
| `test/` | `engine.test.js` (auto-generated checks for every spec), `custom.test.js`, `run_logic.js` (first two packs), `e2e.sh` (real n8n) |

## Commands

```bash
python3 build_packs.py                 # regenerate everything; fails on unknown placeholders or columns
python3 build.py                       # regenerate the first two packs
node --test test/engine.test.js test/custom.test.js
node test/run_logic.js
N8N_DIR=/path/to/n8n-install ./test/e2e.sh   # needs Node 24 and `npm i n8n@2.42.5`; imports all workflows, activates webhooks, posts to each
```

## How a pack works

Every pack is built from four reusable building blocks, each driven by a spec in its `Config` node:

- **Intake**: webhook -> validate -> block duplicates -> tag/route -> log to a sheet -> acknowledge -> alert you.
- **Event**: webhook -> update one row (booked, paid, approved...) -> email the customer.
- **Sequence**: daily schedule -> sends at most ONE message per row per run, never repeats a step, stops on opt-out/status.
- **Digest**: schedule -> list of rows needing attention, or a metrics summary with change vs the previous period.

Packs 5, 7, 15, 16 and 20 add custom flows (Stripe/Shopify triggers, AI drafting with a human approval queue, RSS collection, incident de-duplication).

Every pack ships with `dry_run: true` and an error-alert workflow. Nothing sends or writes until you flip `dry_run`.
