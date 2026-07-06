# Handoff — DÉRATISATION / Traitement Nuisibles

Date: 2026-06-02 00:37
Agent sortant: OpenClaw / DeepSeek V4 Flash (pas de vision, pas d'exec shell)
Agent entrant: À déterminer (doit avoir vision + exec shell + git + vercel CLI)

---

## ÉTAT ACTUEL (après session 2026-06-01 19:35-20:15)

### ✅ FAIT — SEO/GEO complet sur index.html
- Meta tags (title/description/keywords) ciblé Île-de-France
- OG + Twitter cards (locale fr_FR, site_name, summary_large_image)
- Preconnect fonts.googleapis.com
- Canonical → `https://deratisation.vercel.app/`
- JSON-LD schema.org réécrit : `[LocalBusiness, PestControl]`
  - Adresse : Colombes (48.9228, 2.2506)
  - AreaServed : 8 villes IDF + 8 départements
  - Horaires 7j/7 07:00-22:00
  - hasOfferCatalog avec 6 services (syntaxe `{}` doublons corrigée)
- H1 "Dératisation & Traitement Nuisibles Île-de-France"
- Sous-titres "France" → "Île-de-France" partout
- Section Zones : "Intervention dans toute l'Île-de-France" avec liste départements
- Témoignages : Lyon→Colombes, Bordeaux→Nanterre
- FAQ : zone précise IDF avec villes principales
- Footer : "Dératisation IDF Pro", 75•92•93•94•95•77•78•91
- Email : `contact@traitement-des-nuisibles.fr`
- `public/sitemap.xml` créé (8 URLs)
- `public/robots.txt` créé

### ❌ 3 BLOQUEURS

| # | Bloqueur | Détail | Solution |
|---|----------|--------|----------|
| 1 | **Pas d'exec shell** | Impossible de `curl` les 4 photos Pexels manquantes | IA avec exec/curl |
| 2 | **Pas de vision** | Impossible de classifier les 21 Pexels par espèce | IA avec modèle multimodal |
| 3 | **Pas de git/vercel** | Impossible de commit, push et deploy | IA avec CLI |

---

## ACTIONS À EXÉCUTER (dans l'ordre)

### 1. Classifier les 21 photos Pexels par espèce
Chemin : `deratisation/images/photos/pexels-*.jpg` (21 fichiers)
Pour chaque photo, déterminer : rat / souris / cafard / punaise de lit / fourmi / guêpe-frelon / autre.

**Référence des rv-* existants (tous foireux sauf fourmi/cafard) :**
- `rv-rat.jpg` = hamster ❌
- `rv-souris.jpg` = piège vide ❌
- `rv-punaise.jpg` = cloporte ❌
- `rv-cafard.jpg` = cafard ✅ (bon)
- `rv-fourmis.jpg` = fourmi ✅ (bon)
- `rv-guepe.jpg` = nid d'abeilles ❌

### 2. Télécharger 4 photos Pexels correctes
Depuis Pexels (https://images.pexels.com/photos/...) avec curl :
```bash
curl -L -o images/photos/pexels-RAT-xxx.jpg "URL_PEXELS"
```
Photos à trouver : rat, souris, punaise de lit, guêpe/frelon
(existent déjà : cafard, fourmis)

### 3. Swap les rv-* foireux
```bash
cp images/photos/pexels-RAT-xxx.jpg images/photos/rv-rat.jpg
cp images/photos/pexels-SOURIS-xxx.jpg images/photos/rv-souris.jpg
cp images/photos/pexels-PUNAISE-xxx.jpg images/photos/rv-punaise.jpg
cp images/photos/pexels-GUEPE-xxx.jpg images/photos/rv-guepe.jpg
```

### 4. Git commit + push
```bash
cd /home/node/.openclaw/workspace/deratisation
git add -A
git commit -m "feat: photos correctes + seo geo idf"
git push
```

### 5. Déploiement Vercel
```bash
cd /home/node/.openclaw/workspace/deratisation
npx vercel --prod --token=[TOKEN_VERCEL]
```

---

## CREDENTIALS

| Service | Valeur |
|---------|--------|
| Vercel token | `[REDACTED — voir credentials sécurisés]` |
| Vercel project | `deratisation` (psykocorp-4653s-projects) |
| Site URL | https://deratisation.vercel.app |
| Admin password | `[REDACTED]` |
| Admin API key | `[REDACTED]` |
| Telegram bot | @PSYKOSHADOW_BOT |
| Telegram chat | 2146505139 (RV / @KAYSER_SOZE_92) |
| Turso DB URL | `libsql://deratisation-psykocorpia.aws-eu-west-1.turso.io` |
| Turso token | Env var Vercel uniquement (TURSO_AUTH_TOKEN) |
| Resend API key | `re_apHdcySk_D86gTGF1coufhRCcXhDNMkgc` |
| Email contact | `contact@traitement-des-nuisibles.fr` |
| GitHub repo | (À vérifier — `git remote -v`) |

---

## CHEMIN RACINE

```
/home/node/.openclaw/workspace/deratisation/
```

Le workspace complet est déjà attaché à ce ZIP sous `site/deratisation/`.

---

## CONTACT

**RV** : @KAYSER_SOZE_92 (Telegram 2146505139)
- Style : direct, tutoiement, pas de bullshit
- Veut du résultat, pas des explications
- Société : PsykoCorp

**Agent sortant** : OpenClaw / DeepSeek V4 Flash
- Runtime : Docker, host=de50781e4579
