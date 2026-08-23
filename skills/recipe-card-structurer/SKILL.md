---
name: recipe-card-structurer
description: Convert a recipe in the user's standard plain-text format into faithful, validated JSON for a recipe-card visualizer. Use when the user provides a recipe with a title, servings, ingredients, instructions, and optional notes and wants machine-readable recipe-card data. Preserve the source meaning; do not invent missing quantities, steps, temperatures, timings, substitutions, or ingredient relationships.
---

# Recipe Card Structurer

Convert the supplied standard-format recipe into the JSON contract in [schema.md](references/schema.md). The result is intended to be consumed by a client-side recipe-card renderer, so use stable IDs and explicit relationships rather than prose that the renderer must interpret.

## Output rules

1. Return exactly one JSON object and no Markdown fences, commentary, or trailing text.
2. Preserve the recipe title, servings text, ingredient wording, instruction wording, and notes as closely as possible. Condensing an instruction is allowed only in the separate `card_label` field; `text` remains faithful source text.
3. Create one ingredient object for every listed ingredient. Keep parenthetical alternatives and conversions in `display`; put a parsed numeric quantity in `quantity` only when unambiguous.
4. Create components from explicit ingredient section headings. If there is no heading, use one component named `Main`.
5. Create ordered steps from the instruction paragraphs. Do not merge steps when doing so would hide sequence, timing, temperature, conditionals, or a later reuse of an ingredient.
6. Link ingredients to steps only when the source explicitly or clearly implies the relationship. If a relationship is uncertain, omit the link and add a concise item to `validation.issues`.
7. Model intermediate results (for example, a dressing) as component outputs. Use `inputs` and `outputs` on steps so the SPA can draw arrows and brackets.
8. Represent “about ¾,” “as needed,” “to taste,” optional ingredients, and ranges as display text or quantity qualifiers; never turn them into false precision.
9. Preserve notes separately. A note may reference an ingredient or step, but do not silently convert advice into an instruction.
10. Set `validation.needs_review` to `true` whenever parsing required an assumption, a relationship is ambiguous, or the source contains an unsupported structure. Otherwise set it to `false`.

## Visual row ordering

The `ingredients` array is also the renderer's left-to-right/vertical row order. Do not preserve the source's section order when it conflicts with the cooking sequence. Order ingredients by the first instruction step in which each ingredient is used; use their original order as the tie-breaker. This puts ingredients added late (for example, a garnish or a final fold-in) near the bottom of the card even if they appeared earlier in the source list.

Every ingredient must include `row_order` (1-based visual position) and `first_use_step` (the 1-based step where it is first used). If an ingredient is only mentioned in notes, set `first_use_step` to `null` and place it after all used ingredients. Keep `component_id` unchanged so source/component membership remains available independently of visual row order.

## Quantity parsing

Use `quantity.value` for a single numeric value and `quantity.min`/`quantity.max` for a range. Use the original unit text (`g`, `tbsp`, `tsp`, etc.). Fractions may be numeric when unambiguous, but always retain the exact source expression in `quantity.display`. For quantities such as “black pepper, to taste,” set `value` to `null` and preserve the phrase in `display`.

## Relationship handling

Each step input is either `{ "type": "ingredient", "id": "..." }` or `{ "type": "component", "id": "..." }`. Each output uses the same shape. For an ingredient that is prepared and then used later, keep the ingredient as the input to the preparation step and output a component only when the recipe names or clearly creates a reusable mixture. An ingredient can occur in multiple steps; this is required for “divided” or staged additions. A component input represents the portion produced so far, not ingredients that have not yet been used; the renderer uses `first_use_step` to calculate this boundary.

## Validation

Check that every referenced ID exists, step order starts at 1 and is sequential, every ingredient belongs to a component, `row_order` is unique and sequential, every `first_use_step` points to a valid step or is `null`, and every listed instruction is represented by a step. Put any failure in `validation.issues` using plain language. Do not repair the source silently.

For the full JSON shape and a worked example, read [schema.md](references/schema.md).
