# n8n Packs

Two sellable n8n workflow packs plus the generator and tests that produced them.

- `agency-client-onboarding/`: deal won -> onboarding started
- `cleaning-lead-to-booking/`: website lead -> booked clean
- `build.py`: regenerates all workflow JSON and sheet CSVs from `*/logic/*.js`
- `test/run_logic.js`: unit tests for every Code-node script (`node test/run_logic.js`)
- `test/e2e.sh`: imports the workflows into a real n8n and exercises the webhooks (needs `npm install n8n@2.42.5` somewhere)
- `LISTING.md`: listing copy, pricing hypotheses, pre-publish checklist

Edit logic in `*/logic/*.js`, run the tests, then `python3 build.py`.
