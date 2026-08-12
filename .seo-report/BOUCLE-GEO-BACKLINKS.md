# 🌀 BOUCLE GEO+BACKLINKS — Dératisation (traitement-des-nuisibles.fr)

Boucle totale d'amélioration continue du GEO (SEO + generative engine optimization)
+ prospection backlinks. Opérationnelle via cron Hermes quotidien.

## 📌 Doctrine (validée RV)
- **LLM (alias ouverts, jamais en dur)** : ref `seo-engine-agentique/references/llm-roles.yaml`
  - code/connecteurs = deepseek-chat
  - rédaction française = mistral-small (local)
  - tâches légères = qwen-local
  - reviewer critique = deepseek-chat
- **3 HUMAN GATES NON NÉGOCIABLES** :
  1. `publish_live=true` — RV approuve chaque brouillon de contenu/page avant publication
  2. `outreach_send=true` — RV approuve chaque email de prospection backlink avant envoi
  3. `adopt_autoimprove=true` — RV valide toute suggestion d'auto-amélioration (sandbox)

## 🔁 Étapes de la boucle (1x/jour)
1. **Étude SEO/GEO** (job actuel `seo-geo-quotidien-deratisation` 08:30)
   → rapport `.seo-report/RAPPORT-SEO-JOUR.md` + gaps dans `.seo-report/seo-gaps-current.json`
2. **Identifier les opportunités backlinks** (NOUVEAU)
   → prospection de cibles éditoriales locales (annuaires pro IDF/78, blogs locaux,
     presse locale Yvelines, sites partenaires) → `.seo-report/backlink-targets-current.json`
   - Chaque cible : domaine, type, angle éditorial proposé, score pertinence (thématique+x contexte)
3. **Rédiger emails de prospection** (NOUVEAU) — UNIQUEMENT brouillons
   → `.seo-report/drafts/backlink-email-<domaine>.md` (ton, personnalisé, pas de spam, 1 angle)
   → RESTE en brouillon tant que RV n'a pas validé (human gate 2)
4. **Génération contenu enrichi** (NOUVEAU)
   → suggestions de pages/FAQ/sections qui matchent les gaps detectés
   → brouillons dans `.seo-report/drafts/` (human gate 1 avant pub)
5. **Auto-amélioration** (NOUVEAU)
   → compare résultat attendu vs obtenu (impressions/clics si Search Console dispo, sinon score)
   → propose ajustements de prompts/règles dans `.seo-report/autoimprove-proposals/` (sandbox)
   → jamais appliqué sans validation RV (human gate 3)

## 📁 Emplacements
- Rapports : `.seo-report/`
- Brouillons sortants : `.seo-report/drafts/`
- Propositions auto-amélioration : `.seo-report/autoimprove-proposals/`
- State traceur : `.seo-report/loop-state.json`

## 🧮 Mise à jour complète le [DATE]
- [ ] Backlinks targets générés dans `.seo-report/backlink-targets-current.json`
- [ ] Drafts emails backlink dans `.seo-report/drafts/` (en attente validation RV)
- [ ] Drafts contenu enrichi dans `.seo-report/drafts/` (en attente validation RV)
- [ ] Propositions auto-amélioration sandbox
- [ ] `loop-state.json` mis à jour
