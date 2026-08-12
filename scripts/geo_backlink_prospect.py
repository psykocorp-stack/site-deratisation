#!/usr/bin/env python3
"""
Prospection de cibles potentiales backlinks pour traitement-des-nuisibles.fr
Genere .seo-report/backlink-targets-current.json avec un pool de cibles editoriales
locales (annuaires pro IDF/78, presse locale, blogs, partenaires).

C'est un POINT DE DEPART a enrichir chaque cycle — les cibles sont classees par
pertinence thematique (dératisation / nuisibles / habitat / collectivite). La
REALITE (existence, URL, contact) est verifiee a chaque cycle avant prospection.
"""
import json, os, datetime

REPO = "/opt/data/deratisation"
OUT = os.path.join(REPO, ".seo-report", "backlink-targets-current.json")

# Pool de cibles (depart) — a verifier et enrichir cycle apres cycle.
TARGETS = [
    {"domaine": "exemple-annuaire-local.fr", "type": "annuaire_pro", "zone": "78",
     "angle": "editeur liste d'entreprises fiable → ajout fiche dératisation certifiée Qualiopi", "score": 0.5},
]

def main():
    now = datetime.datetime.now().isoformat()
    data = {"generated_at": now, "site": "traitement-des-nuisibles.fr",
            "note": "Pool initial a verifier (URL/contact/pertinence) + enrichir. Verifier existence reelle avant tout envoi (human gate).",
            "targets": [{"domaine": t["domaine"], "type": t["type"], "zone": t["zone"],
                         "angle": t["angle"], "score_pertinence": t["score"],
                         "statut": "a_verifier"} for t in TARGETS]}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] {len(data['targets'])} cibles ecrites dans {OUT}")

if __name__ == "__main__":
    main()
