# Assets cartes — licences & provenance

## `svg-cards.svg` — CANDIDAT (décision d'adoption = Pierre, spec §4.5 / §8-Q8)

- **Source** : SVG-cards 4.0.0 — https://github.com/htdebeer/SVG-cards
  (fichier `svg-cards.svg`, récupéré 2026-07-06).
- **Auteurs** : © 2005 David Bellot · © 2016–2017 Huub de Beer.
- **Licence** : **GNU LGPL v2** (ou ultérieure) — logiciel libre, réutilisable/redistribuable.
- **Pattern** : **anglais / international** (index de coin **K / Q / J**, pas R / D / V).

### Statut = CANDIDAT, pas encore adopté

La spec **privilégie un portrait FRANÇAIS (R/D/V)** ; le jeu anglais n'est prévu qu'en
**fallback si la lisibilité mobile l'exige** (§4.5). Ce set LGPL est un **candidat de secours** :
- ✅ libre, un seul fichier (32 faces + figures dessinées), lisible.
- ⚠️ index de coin **anglais K/Q/J** — un joueur de belote FR attend **R/D/V**.

**Décision d'adoption réservée à Pierre** (gate visuel « tester à taille réelle AVANT d'adopter »).
Preuve fournie : `assets/preview.html` + capture `web/e2e-shots/cards-preview.png` (cartes à ~60 px).

**Non adopté en production** : `index.html` conserve son rendu actuel (coins R/D/V FR + pip) tant
que Pierre n'a pas tranché entre (a) sourcer un portrait FR Wikimedia, ou (b) accepter ce set anglais.

## Dos de carte / tapis

Rendus par les **tokens du design system** (variables CSS `--felt-*`, `--rail*`, `--brass*`),
pas d'asset externe. Inchangé.
