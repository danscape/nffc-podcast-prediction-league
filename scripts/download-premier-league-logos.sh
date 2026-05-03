#!/usr/bin/env bash
set -e

OUT_DIR="public/club-logos"
mkdir -p "$OUT_DIR"

download_logo() {
  SLUG="$1"
  URL="$2"

  echo "Downloading $SLUG..."
  curl -L --fail --silent --show-error "$URL" -o "$OUT_DIR/$SLUG.png"
}

download_logo "arsenal" "https://crests.football-data.org/57.png"
download_logo "aston-villa" "https://crests.football-data.org/58.png"
download_logo "bournemouth" "https://crests.football-data.org/bournemouth.png"
download_logo "brentford" "https://crests.football-data.org/402.png"
download_logo "brighton" "https://crests.football-data.org/397.png"
download_logo "burnley" "https://crests.football-data.org/328.png"
download_logo "chelsea" "https://crests.football-data.org/61.png"
download_logo "crystal-palace" "https://crests.football-data.org/354.png"
download_logo "everton" "https://crests.football-data.org/62.png"
download_logo "fulham" "https://crests.football-data.org/63.png"
download_logo "leeds" "https://crests.football-data.org/341.png"
download_logo "liverpool" "https://crests.football-data.org/64.png"
download_logo "man-city" "https://crests.football-data.org/65.png"
download_logo "man-united" "https://crests.football-data.org/66.png"
download_logo "newcastle" "https://crests.football-data.org/67.png"
download_logo "nottingham-forest" "https://crests.football-data.org/351.png"
download_logo "sunderland" "https://crests.football-data.org/71.png"
download_logo "tottenham" "https://crests.football-data.org/73.png"
download_logo "west-ham" "https://crests.football-data.org/563.png"
download_logo "wolves" "https://crests.football-data.org/76.png"

cat > "$OUT_DIR/manifest.json" <<'JSON'
{
  "arsenal": "/club-logos/arsenal.png",
  "aston-villa": "/club-logos/aston-villa.png",
  "bournemouth": "/club-logos/bournemouth.png",
  "brentford": "/club-logos/brentford.png",
  "brighton": "/club-logos/brighton.png",
  "burnley": "/club-logos/burnley.png",
  "chelsea": "/club-logos/chelsea.png",
  "crystal-palace": "/club-logos/crystal-palace.png",
  "everton": "/club-logos/everton.png",
  "fulham": "/club-logos/fulham.png",
  "leeds": "/club-logos/leeds.png",
  "liverpool": "/club-logos/liverpool.png",
  "man-city": "/club-logos/man-city.png",
  "man-united": "/club-logos/man-united.png",
  "newcastle": "/club-logos/newcastle.png",
  "nottingham-forest": "/club-logos/nottingham-forest.png",
  "sunderland": "/club-logos/sunderland.png",
  "tottenham": "/club-logos/tottenham.png",
  "west-ham": "/club-logos/west-ham.png",
  "wolves": "/club-logos/wolves.png"
}
JSON

echo ""
echo "Done. Logos saved in public/club-logos"
ls -la "$OUT_DIR"
