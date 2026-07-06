# Design Brief — Dératisation.fr

> Préparé le 18 mai 2026. À destination d'une IA de design (Claude Design, Open Design, Midjourney, etc.)

---

## 1. Identité de la marque

**Nom :** Dératisation.fr  
**Slogan :** Expert anti-nuisibles — France  
**URL live :** https://deratisation.vercel.app  
**Code source :** HTML/CSS/JS statique déployé sur Vercel

**Positionnement :** Marketplace de dératisation professionnelle. Nous connectons des particuliers et entreprises avec des techniciens certifiés Certibiocide. Intervention rapide 7j/7, devis gratuit sous 24h.

**Cible :**
- Particuliers (appartements, maisons) avec infestation
- Professionnels (restaurants, hôtels, bureaux, copropriétés) ayant obligation HACCP

**Personnalité de marque :** Professionnel, rassurant, urgent mais pas alarmiste. Confiance + expertise + transparence.

**Palette actuelle :**
- Primaire : Bleu marine profond `#0a1628` → `#132244`
- Accent : Ambre `#f59e0b` → `#d97706`
- Neutres : Gris froids (slate)
- Succès : Vert `#16a34a`
- Arrière-plan cartes : Blanc `#ffffff`
- Fond sections alternées : `#f8fafc`

---

## 2. Structure du site (6 pages)

### Page 1 — Accueil (index.html)
Sections dans l'ordre :
1. **Header** — Logo + navigation (Devis, Contact, Comment ça marche) + téléphone
2. **Hero** — Grand fond (photographie floutée d'un technicien en hazmat) + H1 + sous-titre SEO-riche + 4 badges (Intervention 7j/7, Devis gratuit, Certifié & assuré, Urgence 24h) + 2 CTA + grille de 5 cards avec photos nuisibles (rats, souris, cafards, punaises de lit, fourmis) + prix
3. **Stats bar** — 4 métriques (2800+ clients, 98% succès, 7j/7, 30+ techniciens)
4. **Pourquoi nous choisir** — 6 cartes de confiance (photos RV + icônes SVG)
5. **Photos banner** — 4 photos Pexels en grille (rats, insectes, spray, hazmat)
6. **Solutions** — 6 cartes (rats, souris, cafards, punaises de lit, fourmis, guêpes/frelons)
7. **Pricing** — 6 cartes tarifs avec prix et bouton "Choisir ce forfait"
8. **How it works** — 3 étapes simples (Devis → Diagnostic → Intervention)
9. **Formulaire de devis** — Sélecteur nuisible + département + surface + coordonnées
10. **Blog preview** — 3 articles fictifs
11. **CTA** — Bandeau bleu marine avec CTA
12. **Footer** — Logo + services + contact + légal
13. **Sticky bar** — Urgence flottante en bas

### Page 2 — Comment ça marche (comment-ca-marche.html)
7 sections :
1. Hero avec processus en 5 étapes (schéma accordéon)
2. Étape 1 : Devis gratuit
3. Étape 2 : Diagnostic
4. Étape 3 : Intervention (avec protocoles par nuisible)
5. Étape 4 : Second passage de suivi
6. Étape 5 : Garantie résultat
7. Grille des méthodes avec prix
8. CTA + footer

### Page 3 — Admin (admin.html)
Back-office pour gérer les leads. Pas de design nécessaire.

### Pages à créer :
- **Page Contact** (contact.html)
- **Page "Devenir Partenaire"** (devenir-partenaire.html) — recrutement de techniciens Psyko Corp

---

## 3. Ressources visuelles disponibles

### Photos des nuisibles (RV — photos réelles de son téléphone)
- `/images/photos/rv-rat.jpg` — Rat (vue rapprochée)
- `/images/photos/rv-souris.jpg` — Souris
- `/images/photos/rv-cafard.jpg` — Cafard/Blatte (vue macro)
- `/images/photos/rv-punaise.jpg` — Punaises de lit sur matelas
- `/images/photos/rv-fourmis.jpg` — Fourmis
- `/images/photos/rv-guepe.jpg` — Guêpe/Frelon

### Icônes de confiance (RV — photos d'icônes)
- `/images/photos/rv-rapide.jpg` — Pour Intervention rapide (éclair)
- `/images/photos/rv-certifie.jpg` — Pour Certifié & assuré (diplôme/certificat)
- `/images/photos/rv-avis.jpg` — Pour Garantie résultat / Avis clients
- `/images/photos/rv-localisation.jpg` — Pour Contrats HACCP (localisation)

### Photos Pexels (background, banner, blog)
- `/images/photos/pexels-3985320.jpg` — Hero background (technicien hazmat + masque à gaz)
- `/images/photos/pexels-5034757.jpg` — Rat (trust banner)
- `/images/photos/pexels-8714156.jpg` — Insecte (trust banner)
- `/images/photos/pexels-6334096.jpg` — Spray traitement (trust banner)
- `/images/photos/pexels-5591582.jpg` — Technicien hazmat (trust banner)
- `/images/photos/pexels-5900197.jpg` — Traitement en action (blog)
- `/images/photos/pexels-7123852.jpg` — Contexte pièce (blog)
- `/images/photos/pexels-8172912.jpg` — Équipement (blog)

### Icônes SVG créées
- `/images/icon-payment.svg` — Paiement (cercle + €)
- `/images/icon-eco.svg` — Écologique (feuille + check)
- `/images/icon-lightning.svg` — Éclair
- `/images/icon-phone.svg` — Téléphone
- `/images/icon-check.svg` — Check vert
- `/images/icon-star.svg` — Étoile
- `/images/icon-email.svg` — Email
- `/images/icon-shield.svg` — Bouclier
- `/images/icon-chevron-down.svg` — Flèche bas

### Logos
- `/images/logo-typo.svg` — Typo logo (shield SVG inline + "DÉRATISATION.fr")
- `/images/logo-dcross.svg`, `logo-dot.svg`, `logo-shield.svg`, `logo-shieldpro.svg` — Variantes

---

## 4. Problèmes de design actuels

### 🟡 Critiques / À améliorer
1. **Manque de logo professionnel** — Le logo actuel est une typo basique + icône shield inline. Besoin d'un vrai logo: shield/insecte + typographie personnalisée
2. **Hero background** — La photo hazmat est percutante mais trop sombre/texturée. Pourrait bénéficier d'un overlay gradient plus doux ou d'un motif subtil
3. **Couleur primaire** — Le bleu marine `#0a1628` est très foncé, parfois difficile à lire sur fond sombre
4. **Photos des nuisibles** — Les photos RV sont authentiques mais de qualité smartphone (pas studio). Besoin peut-être de les recadrer ou d'ajuster le contraste
5. **Section pricing** — Les cartes sont fonctionnelles mais manquent de hiérarchie visuelle (pas de featured/popular)
6. **Blog** — Les articles sont fictifs, besoin de vrais visuels
7. **Icônes SVG** — Les icônes SVG actuelles sont basiques (faites à la main en 2 minutes)
8. **Navigation** — Manque d'indicateur de page active, pas d'animation au scroll
9. **Responsive** — Globalement OK mais quelques breakpoints à vérifier
10. **Formulaire de devis** — Design fonctionnel mais pourrait être plus engageant (multi-step, progress bar)

### 🟢 Points forts à conserver
- Palette de couleurs (bleu + ambre) fonctionne bien pour le secteur
- Photos réelles des nuisibles (authenticité > stock photos)
- Section trust avec photos des avis/certifications
- Ombres multi-couches façon Stripe (déjà appliquées)
- Typographie Inter bien choisie
- Structure SEO solide (JSON-LD, meta, sitemap)

---

## 5. Design directives

### Éléments obligatoires à conserver
- ✅ Photos RV des nuisibles (pas de stock photos génériques)
- ✅ Palette bleu marine + ambre (peut évoluer mais même famille)
- ✅ Toutes les sections listées ci-dessus
- ✅ Ton professionnel mais pas institutionnel froid

### Éléments souhaités
- Logo professionnel (shield stylisé + typo moderne)
- Animations subtiles au scroll (fade-in, slide-up)
- Hero avec meilleur contraste et overlay gradient
- Pricing card "popular" mise en avant
- Design system plus cohérent (boutons, cartes, espacements)
- Icônes SVG plus travaillées (custom, pas génériques)

### Éléments à ne PAS faire
- ❌ Pas de photos génériques de personnes en costard
- ❌ Pas de rouge agressif (le danger est déjà traité, on rassure)
- ❌ Pas de popups intempestifs
- ❌ Pas de polices décoratives (Inter suffit)

---

## 6. Technologies utilisées

- **Hébergement :** Vercel (déploiement automatique via `npx vercel --prod`)
- **Base de données :** Turso (SQLite edge)
- **Notifications :** Telegram (bot RV) + Resend (emails)
- **Backend :** API serverless Vercel (/api/*.js)
- **Frontend :** HTML/CSS/JS vanilla (pas de framework)
- **Single CSS file :** `/css/style.css` (~1500 lignes)
- **Single JS file :** `/js/main.js`

---

## 7. Tâches de design que l'IA doit résoudre

Voici les prompts concrets que l'IA de design doit exécuter :

### Tâche 1 : Logo
> "Crée un logo pour 'Dératisation.fr', service professionnel anti-nuisibles. Style : shield moderne avec silhouette stylisée d'insecte ou rongeur. Typographie : Inter ou sans-serif, caractères bold modernes. Couleurs : bleu marine profond (#0a1628) et ambre (#f59e0b). Format SVG responsive."

### Tâche 2 : Hero amélioré
> "Propose un design de hero pour site de dératisation. Fond : photo technicien hazmat avec overlay gradient (bleu marine → transparent). Titre : police 2.75rem. Badges : 4 puces avec icônes. CTA : bouton ambree + téléphone. 5 cards nuisibles en grille avec photos circulaires. Inspiration : Stripe hero section."

### Tâche 3 : Pricing section
> "6 cards de prix pour services de dératisation. Une card 'Plus populaire' en surbrillance. Photos nuisibles en petit cercle. Prix en gros. Bouton 'Choisir ce forfait'. Fond alterné grey 50."

### Tâche 4 : Système d'icônes complet
> "Crée un jeu cohérent d'icônes SVG pour site de dératisation: téléphone, urgence/éclair, paiement €, écologique/feuille, étoile, check, email, bouclier, flèche bas. Style: outline, stroke-width 1.8px, arrondi, palette ambre/gris. 24x24px."

### Tâche 5 : Animations CSS
> "Propose des animations CSS subtiles : fade-in-up au scroll avec opacité + translateY, nombres qui comptent dans la stats bar, hover fluides sur les cards (translateY -4px + shadow)."

### Tâche 6 : Formulaire de devis
> "Convertis le formulaire actuel en multi-step avec progress bar: Étape 1: type de nuisible (photos), Étape 2: infos contact, Étape 3: récap. Animations entre étapes."

### Tâche 7 : Page "Devenir Partenaire"
> "Crée une landing page de recrutement pour techniciens Certibiocide. Hero avec 'Rejoignez Psyko Corp'. Avantages (missions flexibles, revenus, support). Formulaire de candidature. CTA fort."

---

## 8. Raccourcis Vercel pour IA

```bash
# Déployer le site après modification
cd /app && npx vercel --prod --token [TOKEN_VERCEL]

# Fichier CSS principal
/app/css/style.css

# Page d'accueil
/app/index.html

# Page comment-ça-marche
/app/comment-ca-marche.html

# Images
/app/images/photos/
/app/images/
```

---

## 9. Contraintes

- Site statique (HTML/CSS/JS vanilla) — pas de React, Vue, etc.
- Le CSS actuel fait ~1500 lignes, à organiser par section
- Les photos RV sont sacrées — les garder coûte que coûte
- Le site doit passer Google PageSpeed > 90
- SEO prioritaire : contenu lisible, pas de JS lourd
- Mobile-first responsive
- Pas de dépendances externes (CDN Google Fonts OK, pas de jQuery, pas de Tailwind)

---

*Document préparé par l'agent RV (OpenClaw) pour transfert à une IA de design.*
