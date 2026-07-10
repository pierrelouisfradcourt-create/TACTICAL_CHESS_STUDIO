"""Oracle du moteur de mutation testing (méta-oracle).

On teste la GÉNÉRATION de mutants (pure, rapide) ; l'exécution réelle par mutant
est lente (elle lance node) et n'est pas dans la suite unitaire.
"""
from forge.mutation import Mutant, generate_mutants


def test_generates_a_mutant_per_operator_occurrence():
    text = "if (a >= b && c === d) return true;\n"
    muts = generate_mutants(text)
    names = {m.name for m in muts}
    assert "ge->gt" in names        # >= -> >
    assert "and->or" in names       # && -> ||
    assert "eq->neq" in names       # === -> !==
    assert "true->false" in names   # true -> false


def test_mutant_actually_changes_the_code():
    text = "return score >= best;\n"
    m = next(m for m in generate_mutants(text) if m.name == "ge->gt")
    assert ">=" not in m.mutant_text          # l'occurrence a bien muté
    assert "score > best" in m.mutant_text
    assert isinstance(m, Mutant)


def test_skips_comment_only_lines():
    text = "// on garde le >= ici, ne pas muter\nx = a >= b;\n"
    muts = [m for m in generate_mutants(text) if m.name == "ge->gt"]
    assert len(muts) == 1                      # seule la vraie ligne de code est mutée
    assert muts[0].line == 2


def test_no_mutation_no_mutants():
    assert generate_mutants("const x = plainText();\n") == []


def test_skip_marker_excludes_equivalent_mutants():
    """Une ligne marquée `mutation:skip` (mutant prouvé équivalent) n'est pas mutée."""
    text = "a >= b;\nc >= d; // mutation:skip équivalent\n"
    muts = [m for m in generate_mutants(text) if m.name == "ge->gt"]
    assert len(muts) == 1        # seule la ligne non marquée est mutée
    assert muts[0].line == 1


def test_each_occurrence_is_its_own_mutant():
    text = "a >= b; c >= d;\n"                  # deux occurrences => deux mutants
    assert len([m for m in generate_mutants(text) if m.name == "ge->gt"]) == 2
