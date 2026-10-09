// Reads all Shopify products and emails one list of variants at or below the low-stock threshold (inventory-tracked variants only).
const th = Number(cfg.low_stock_threshold ?? 5);
const lines = [];
for (const it of $('Shopify Products').all()) {
  const p = it.json;
  for (const v of p.variants || []) {
    if (!v.inventory_management) continue;
    const q = Number(v.inventory_quantity);
    if (Number.isFinite(q) && q <= th) lines.push({ product: p.title, variant: v.title === 'Default Title' ? '' : v.title, sku: v.sku || '', qty: q });
  }
}
if (!lines.length) return [];
lines.sort((a, b) => a.qty - b.qty);
const rows = lines.map(l => `<tr><td>${esc(l.product)}${l.variant ? ' / ' + esc(l.variant) : ''}</td><td>${esc(l.sku)}</td><td align="right">${l.qty}</td></tr>`).join('');
return [{ json: { dry_run: cfg.dry_run === true, count: lines.length, to: cfg.owner_email, subject: renderText(flow.subject, { count: lines.length }),
  html: render(flow.intro, { count: lines.length, threshold: th }) + `<table cellpadding="6"><tr><th align="left">Item</th><th align="left">SKU</th><th>Qty</th></tr>${rows}</table>` } }];
