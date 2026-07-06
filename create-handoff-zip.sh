#!/bin/bash
# Handoff zip creator — exécute ce script pour créer le zip de transfert
# Usage: bash create-handoff-zip.sh

WORKSPACE="/home/node/.openclaw/workspace"
OUTPUT="$WORKSPACE/handoff-deratisation-2026-06-01.zip"

# Fichiers racine workspace
ROOT_FILES=(
  "$WORKSPACE/MEMORY.md"
  "$WORKSPACE/USER.md"
  "$WORKSPACE/TOOLS.md"
  "$WORKSPACE/SOUL.md"
  "$WORKSPACE/HEARTBEAT.md"
)

# Projets
PROJECT_FILES=(
  "$WORKSPACE/memory/projects/index.md"
  "$WORKSPACE/memory/projects/deratisation.md"
  "$WORKSPACE/memory/projects/hermes.md"
)

# Mémoire du jour
DAILY_MEM=(
  "$WORKSPACE/memory/2026-06-01.md"
)

# Site complet
SITE_DIR="$WORKSPACE/deratisation"

echo "=== Création du fichier: $OUTPUT ==="

# Créer un dossier temporaire pour organiser
TMPDIR=$(mktemp -d)
mkdir -p "$TMPDIR/workspace"
mkdir -p "$TMPDIR/memory/projects"
mkdir -p "$TMPDIR/site"

# Copier fichiers racine
echo "1/4 — Copie fichiers workspace..."
for f in "${ROOT_FILES[@]}"; do
  if [ -f "$f" ]; then
    cp "$f" "$TMPDIR/workspace/"
    echo "  ✓ $(basename $f)"
  fi
done

# Copier projets
echo "2/4 — Copie fichiers projets..."
for f in "${PROJECT_FILES[@]}"; do
  if [ -f "$f" ]; then
    cp "$f" "$TMPDIR/memory/projects/"
    echo "  ✓ $(basename $f)"
  fi
done

# Copier mémoire du jour
echo "3/4 — Copie mémoire du jour..."
for f in "${DAILY_MEM[@]}"; do
  if [ -f "$f" ]; then
    cp "$f" "$TMPDIR/memory/"
    echo "  ✓ $(basename $f)"
  fi
done

# Copier site
echo "4/4 — Copie site deratisation..."
cp -r "$SITE_DIR" "$TMPDIR/site/"
# Nettoyer node_modules, .vercel, .git
rm -rf "$TMPDIR/site/deratisation/node_modules" 2>/dev/null
rm -rf "$TMPDIR/site/deratisation/.vercel" 2>/dev/null
rm -rf "$TMPDIR/site/deratisation/.git" 2>/dev/null
echo "  ✓ site/deratisation/"

# Zipper
cd "$TMPDIR"
zip -r "$OUTPUT" . > /dev/null 2>&1

# Nettoyer
cd "$WORKSPACE"
rm -rf "$TMPDIR"

echo ""
echo "=== ✔ DONE ==="
ls -lh "$OUTPUT"
echo ""
echo "Transmets ce fichier à la nouvelle IA."
