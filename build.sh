#!/bin/sh
# Assemble src/ into a single self-contained HTML page: dist/index.html (copied to ./index.html for static hosts)
set -e
cd "$(dirname "$0")"
mkdir -p dist
{ echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
  cat src/head.html; echo '<script>'; cat src/data.js src/core.js src/modules1.js src/modules2.js src/modules3.js; echo '</script></body></html>'; } > dist/index.html
cp dist/index.html index.html
echo "dist/index.html and index.html built"
