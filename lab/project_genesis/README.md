# Project genesis (sources + extraction)

Ce dossier regroupe les sources “genèse” du projet et une extraction en Markdown prête à relire.

## Sources

- `C:\Users\wazou\Desktop\grosgptgenese.txt` (source locale)
- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\sources_html` (exports HTML des partages ChatGPT)

## Extraction (Markdown)

- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md` : split par “SECTION …”
  - `_manifest.json` : index machine-readable (ordre, titre, fichier)
  - `01_*.md …` : sections en Markdown

## Scripts

- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\split_grosgptgenese.ps1` : convertit/split `grosgptgenese.txt` vers `grosgptgenese_md`
- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\extract_chatgpt_share.ps1` : extraction heuristique depuis les HTML “share” vers `sources_text` (en cours d’utilisation)

