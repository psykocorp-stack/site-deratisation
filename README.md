# Dératisation.fr — Site + API + Admin

## Stack
- **Frontend:** HTML/CSS/JS vanille (pas de framework)
- **Backend:** Vercel Serverless (API Routes)
- **Email:** Mailgun (5 000 emails/mois gratuits)
- **Base de données:** Supabase (optionnel — fonctionne aussi en mémoire)
- **Admin:** Dashboard leads + partenaires

## Structure
```
/
├── index.html              ← Page d'accueil
├── admin.html              ← Dashboard admin
├── *.html                  ← Pages services (deratisation, punaises, etc.)
├── 75-paris.html           ← Pages zones (75-95)
├── blog/*.html             ← Articles de blog
├── css/style.css           ← Stylesheet complet
├── js/
│   ├── main.js             ← Nav, animations, FAQ
│   └── formulaire.js       ← Formulaire 4 étapes
│   └── admin.js            ← Admin panel (dashboard)
├── api/
│   ├── lead.js             ← CRUD leads + Mailgun + Telegram
│   ├── partenaires.js      ← CRUD partenaires
│   └── auth/login.js       ← Authentification admin
├── robots.txt
├── sitemap.xml
└── vercel.json             ← Config Vercel + variables d'env
```

## Déploiement Vercel
1. `npm i -g vercel`
2. `vercel --prod` depuis le dossier
3. Configurer les variables d'environnement :
   - `ADMIN_PASSWORD` = mot de passe admin
   - `MAILGUN_API_KEY` = clé API Mailgun
   - `MAILGUN_DOMAIN` = domaine Mailgun
   - `NOTIFY_EMAIL` = email qui reçoit les notifications
   - `TELEGRAM_BOT_TOKEN` = token bot Telegram (optionnel)
   - `TELEGRAM_CHAT_ID` = chat ID Telegram

## Mailgun (gratuit — 5000 emails/mois)
1. Créer compte sur https://mailgun.com
2. Ajouter un domaine (ex: mg.deratisation.fr)
3. Copier la clé API → coller dans Vercel `MAILGUN_API_KEY`

## Améliorations v2
- ✅ Mailgun pour les emails de leads
- ✅ Notifications Telegram
- ✅ Admin sécurisé (login différé, mdp variable env)
- ✅ Schema.org structured data
- ✅ Sitemap SEO
- ✅ Live validation formulaire
- ✅ Loading states
- ✅ Dark theme admin
- ✅ Animations optimisées
- ✅ Stats réelles (comptent depuis 10 ans, 2800 clients, etc.)
