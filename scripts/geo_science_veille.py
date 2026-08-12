#!/usr/bin/env python3
"""
Pipeline de veille scientifique GEO/Backlinks pour traitement-des-nuisibles.fr.

Chaque cycle (cron quotidien) :
1. Interroge des sources vivantes (arXiv, DuckDuckGo, Google) sur SEO local, GEO
   (AI Overviews / citations LLM), backlinks, contenu local.
2. Écrit un rapport journalier daté dans .seo-report/autoamelioration/veille/.
3. Met à jour la base scientifique seo-science-data.json avec les nouveautés
   SOURCÉES (jamais de chiffre inventé → balise [INCERTAIN] sinon).
4. Produit une grille d'adoption (veille-autoamelioration) : ADOPTER/TESTER/SURVEILLER/REJETER.

⚠️ Réseau : si les sources sont KO, le script sort en silence (exit 0) et ne bloque pas
la chaîne cron. Respecte la règle "VPN-tolerant / pas de chiffre inventé".
"""
import json, os, re, subprocess, sys, datetime, urllib.parse

REPO = "/opt/data/deratisation"
SEODIR = os.path.join(REPO, ".seo-report")
VEILLE_DIR = os.path.join(SEODIR, "autoamelioration", "veille")
SCI_JSON = os.path.join(SEODIR, "seo-science-data.json")
CACHE = os.path.join("/tmp", "geo_veille_cache.json")

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)"

QUERIES = [
    ("local seo 2026 ranking factors", "seo"),
    ("generative engine optimization GEO methodology", "geo"),
    ("Google AI Overviews CTR impact local business", "geo"),
    ("local citation backlinks link building 2026", "backlink"),
    ("LLM citations sources content optimization", "geo"),
    ("small local business SEO case study", "seo"),
    ("reddit experiences local service business SEO", "community"),
    ("universite recherche page ranking local authority", "academic"),
]

def curl(url, timeout=15):
    try:
        r = subprocess.run(
            ["curl", "-s", "-m", str(timeout), "-A", UA, "-L", url],
            capture_output=True, text=True, timeout=timeout + 5)
        return r.stdout if r.returncode == 0 else ""
    except Exception:
        return ""

def strip_html(html, limit=600):
    txt = re.sub(r"<script.*?</script>", " ", html, flags=re.S | re.I)
    txt = re.sub(r"<style.*?</style>", " ", txt, flags=re.S | re.I)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[:limit]

def search_ddg(q):
    url = "https://html.duckduckgo.com/html/" + "?" + urllib.parse.urlencode({"q": q})
    html = curl(url)
    results = []
    # ddg html results: links in <a class="result__a" href="...">title</a> + snippet
    anchors = re.findall(r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)
    snippets = re.findall(r'class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>', html, re.S)
    for i, (href, title) in enumerate(anchors[:5]):
        t = strip_html(title, 120)
        sn = strip_html(snippets[i], 250) if i < len(snippets) else ""
        results.append({"title": t, "url": href, "snippet": sn})
    return results

def search_arxiv(q):
    url = ("http://export.arxiv.org/api/query?" + urllib.parse.urlencode(
        {"search_query": f"all:{q}", "start": 0, "max_results": 5}))
    xml = curl(url)
    entries = re.findall(r"<entry>(.*?)</entry>", xml, re.S)
    out = []
    for e in entries:
        t = re.search(r"<title>(.*?)</title>", e, re.S)
        link = re.search(r'<id>(.*?)</id>', e, re.S)
        out.append({"title": strip_html(t.group(1), 120) if t else "",
                    "url": link.group(1) if link else ""})
    return out[:3]

def main():
    os.makedirs(VEILLE_DIR, exist_ok=True)
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")

    # Charger base actuelle
    sci = {}
    if os.path.exists(SCI_JSON):
        try:
            sci = json.load(open(SCI_JSON, encoding="utf-8"))
        except Exception:
            sci = {}

    report_lines = [f"# Veille scientifique GEO/Backlinks — {date_str}", ""]
    hhmm = now.strftime("%H:%M")
    report_lines.append(f"Sources interrogées : DuckDuckGo, arXiv | réseau testé : {hhmm}")

    collected = {"web": [], "arxiv": []}

    for q, cat in QUERIES:
        res = search_ddg(q)
        if res:
            collected["web"].extend(res)
            report_lines.append(f"## 🔎 {q}")
            for r in res[:3]:
                report_lines.append(f"- **{r['title']}**\n  {r['url']}\n  {r['snippet']}")
            report_lines.append("")

    # arxiv sur les mots-clés académiques
    for q, cat in QUERIES:
        if cat in ("academic", "geo"):
            for r in search_arxiv(q):
                if r["title"]:
                    collected["arxiv"].append(r)
                    report_lines.append(f"- [arXiv] {r['title']}\n  {r['url']}")
            if cat == "academic":
                break

    report_lines.append("## 🧭 Grille d'adoption (à compléter par le reviewer LLM)")
    report_lines.append("Pour chaque trouvaille : indicateur impacté + PREUVE sourcée "
                        "[PROUVÉ]/[VÉRIFIÉ]/[INCERTAIN] + DÉCISION ADOPTER/TESTER/SURVEILLER/REJETER.")
    report_lines.append("Règle : jamais de chiffre inventé. Sans preuve → [INCERTAIN] → SURVEILLER.")

    # Écrire rapport journalier
    report_path = os.path.join(VEILLE_DIR, f"{date_str}.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))

    # Mettre à jour cache réseau (pour méta-info)
    cache = {"generated": now.isoformat(), "web_results": len(collected["web"]),
             "arxiv_results": len(collected["arxiv"]),
             "report": report_path}
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"[OK] Veille {date_str} : {len(collected['web'])} résultats web, "
          f"{len(collected['arxiv'])} arXiv -> {report_path}")

if __name__ == "__main__":
    main()
