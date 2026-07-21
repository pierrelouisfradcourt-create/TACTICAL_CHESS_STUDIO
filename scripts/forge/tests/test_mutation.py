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


def test_gdscript_and_or_mutes():
    """GDScript utilise and/or, pas &&/||. Sans ces regles, le gate mutation
    est edente sur .gd (cf. plan etape 0, tache 4)."""
    from forge.mutation import generate_mutants
    names = {m.name for m in generate_mutants("if a and b:\n")}
    assert "and->or" in names
    names = {m.name for m in generate_mutants("if a or b:\n")}
    assert "or->and" in names


def test_gdscript_equality_mutes():
    from forge.mutation import generate_mutants
    names = {m.name for m in generate_mutants("if hp == 0:\n")}
    assert "eqeq->neq" in names
    names = {m.name for m in generate_mutants("if hp != 0:\n")}
    assert "neq->eqeq" in names


def test_js_strict_equality_not_fragmented():
    """GARDE ANTI-REGRESSION : `===` ne doit jamais produire un mutant `==`->`!=`
    qui casserait la syntaxe JS. Les regles JS existantes restent prioritaires."""
    from forge.mutation import generate_mutants
    mutants = generate_mutants("if (a === b) {}\n")
    names = {m.name for m in mutants}
    assert "eq->neq" in names
    assert "eqeq->neq" not in names
    for m in mutants:
        assert "=!=" not in m.mutant_text
        assert "!===" not in m.mutant_text


def test_and_or_only_as_whole_words():
    """`and`/`or` ne doivent pas muter a l interieur d un identifiant
    (`operand`, `random`, `for`, `word`) — sinon avalanche de faux mutants."""
    from forge.mutation import generate_mutants
    for src in ["var operand = 1\n", "var random_x = 2\n", "var sword = 3\n"]:
        names = {m.name for m in generate_mutants(src)}
        assert "and->or" not in names
        assert "or->and" not in names
