"""studio/factory — couche d'orchestration de l'usine de jeux (IMP-188).

Pipeline : IR (ir_schema_v1) -> template_engine -> llm_logic_engine
           -> oracle_sim -> registry.

Cette couche N'EST PAS un nouveau moteur : elle wrappe `studio_core/`
(ir/, compiler/, runtime/, sim/) qui reste l'unique source de verite du
runtime. studio/factory ajoute uniquement l'orchestration, l'appel LLM de
logique, l'oracle a code de sortie et le registry signe HMAC.
"""

__all__ = [
    "template_engine",
    "llm_logic_engine",
    "oracle_sim",
    "factory_loop",
]
