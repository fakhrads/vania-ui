#!/usr/bin/env bash
# _wrap.sh <body-file> <out.dc.html> <w> <h>
# Bungkus body artboard dengan helmet + blok tema yang identik di semua artboard.
set -euo pipefail
BODY="$1"; OUT="$2"; W="$3"; H="$4"
DARK=$(sed -n '2p' _tokens.txt)
LIGHT=$(sed -n '5p' _tokens.txt)

cat > "$OUT" <<HEAD
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: oklch(.720 .130 274); text-decoration: none; }
    a:hover { color: oklch(.962 .004 264); }
    .num { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
  </style>
</helmet>
HEAD

cat "$BODY" >> "$OUT"

cat >> "$OUT" <<TAIL
</x-dc>

<script data-dc-script data-props='{"tema":{"editor":"enum","options":["gelap","terang"],"default":"gelap"},"\$preview":{"width":$W,"height":$H}}'>
class Component extends DCLogic {
  themes() {
    return {
      gelap: "$DARK",
      terang: "$LIGHT"
    };
  }
  renderVals() {
    const t = this.themes();
    return { css: t[this.props.tema] || t.gelap };
  }
}
</script>
</body>
</html>
TAIL
echo "$OUT $(wc -c < "$OUT") byte"
