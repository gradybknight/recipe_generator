---
name: recipe-card-structurer
description: Convert a recipe in the user's standard plain-text format into faithful, validated JSON for a recipe-card visualizer. Use when the user provides a recipe with a title, servings, ingredients, instructions, and optional notes and wants machine-readable recipe-card data. Preserve the source meaning; do not invent missing quantities, steps, temperatures, timings, substitutions, or ingredient relationships.
---

# Recipe Card Structurer

Convert the supplied standard-format recipe into the JSON contract in [schema.md](references/schema.md). The result is intended to be consumed by a client-side recipe-card renderer, so use stable IDs and explicit relationships rather than prose that the renderer must interpret. Generate the recipe card and timeline data in the same JSON object so the renderer can show both sequential and parallel work.

## Output rules

1. Return exactly one JSON object and no Markdown fences, commentary, or trailing text.
2. Preserve the recipe title, servings text, ingredient wording, instruction wording, and notes as closely as possible. Condensing an instruction is allowed only in `card_label` and `card_detail`; `text` remains faithful source text.
3. Create one ingredient object for every listed ingredient. Keep parenthetical alternatives and conversions in `display`; put a parsed numeric quantity in `quantity` only when unambiguous.
4. Create components from explicit ingredient section headings. If there is no heading, use one component named `Main`.
5. Create ordered steps from the instruction paragraphs. Do not merge steps when doing so would hide sequence, timing, temperature, conditionals, or a later reuse of an ingredient.
6. Link ingredients to steps when the source explicitly or clearly implies the relationship. Optional ingredients listed without an explicit step may be assigned to the most semantically appropriate incorporation step when the cooking sequence makes that moment clear (for example, optional herbs and spices belong with a seasoning step before tasting). Mark that inference in `validation.issues`; if no logical step is clear, leave the optional ingredient unassigned.
7. Model intermediate results (for example, a dressing) as component outputs. Use `inputs` and `outputs` on steps so the SPA can draw arrows and brackets.
8. Represent “about ¾,” “as needed,” “to taste,” optional ingredients, and ranges as display text or quantity qualifiers; never turn them into false precision.
9. Preserve notes separately. A note may reference an ingredient or step, but do not silently convert advice into an instruction.
10. Set `validation.needs_review` to `true` whenever parsing required an assumption, a relationship is ambiguous, or the source contains an unsupported structure. Otherwise set it to `false`.
11. Always generate a `timeline` object, even when the source does not provide enough timing information for a complete schedule. Use `null` for unavailable durations and explain the limitation in `timeline.notes` and `validation.issues` when it affects usefulness.

## Timeline generation

The timeline is a dependency-aware preparation plan, not a second copy of the step list. Create one task for each meaningful activity that can occupy time or block another activity. You may group adjacent source steps only when they form one continuous activity with the same dependencies and timing; do not group steps when doing so would hide a cook, rest, chill, hold, or other opportunity for parallel work.

Each timeline task must include:

- A stable `id`, human-readable `label`, and `lane` such as `Chicken`, `Sauce`, `Oven`, or `Salad prep`.
- `source_step_ids` linking it to every source step it represents.
- `duration_min` and `duration_max`. Use source-backed values when the recipe states a duration or range. If no duration is stated, use `null`; do not invent a duration from general cooking knowledge.
- `duration_source`: `"source"` for an explicit source duration, `"unspecified"` when the source provides none, or `"inferred"` only when the user explicitly authorizes estimated durations.
- `inferred`: `true` for a suggested parallel-prep task or any task whose interpretation is not explicit in the source; otherwise `false`.
- `depends_on`, an array of `{ "task_id": "...", "relationship": "finish-to-start" | "start-to-start" | "finish-to-finish" }` objects.

Use dependencies to encode real process constraints:

- `finish-to-start`: the dependent task cannot begin until the prerequisite finishes. Use this for actions such as reducing a sauce made from cooked meat, slicing food after resting, or serving after chilling.
- `start-to-start`: the dependent task may begin when the prerequisite begins. Use this for independent prep that can happen while a cook, bake, or simmer is underway.
- `finish-to-finish`: the dependent task should finish no earlier than the prerequisite. Use sparingly for coordinated finishing work.

Do not infer parallelism merely because tasks have different lanes. A task may overlap another only when its ingredients, equipment, and outputs are independent or the source clearly permits concurrent work. When a later task consumes a result from an earlier task, add an explicit dependency even if both tasks use the same broad component. Prefer a specific timeline dependency over relying on reused component IDs.

The timeline may include an inferred task for preparation explicitly implied by an ingredient or step, such as chopping cucumber before mixing a salad. If its duration is not stated, keep the duration fields `null`, mark it `inferred: true`, and report that the task timing is unspecified. Do not turn an inferred task into a false precise schedule.

`timeline.summary` should describe the main scheduling opportunity in one sentence. `timeline.notes` should explain source-vs-inferred timing and any meaningful uncertainty. The renderer calculates task start positions from durations and dependencies; do not add hand-authored absolute start times to the contract.

Before finalizing the JSON, perform a timeline cook-through pass. Read the tasks as a physical sequence rather than as extracted labels and numbers:

1. For each task, identify what is physically available at its start, what it produces, and what equipment or resource it occupies.
2. Trace every task that consumes a cooked, rested, chilled, reduced, mixed, or otherwise transformed result back to the task that produces that result.
3. Add a `finish-to-start` dependency whenever the prerequisite result must be complete before the next task can begin. Do not let different lanes imply parallelism when the food or equipment is still shared.
4. Add `start-to-start` only for genuinely independent work that can begin while another task is active, such as chopping salad ingredients while chicken cooks.
5. Walk the resulting schedule in order and ask: “Could a person actually do these tasks at these times with the stated ingredients, equipment, and intermediate results?” Correct any overlap that would require an unavailable result, an occupied piece of equipment, or an impossible physical transition.
6. Check the critical path separately from optional parallel work. A sauce made from broiled chicken, for example, must start after broiling and doneness checking finish even if the sauce has its own lane.

This reasoning pass is required even when all durations and step numbers were extracted correctly. If the physical relationship is ambiguous, preserve the ambiguity in `validation.issues` instead of silently scheduling the tasks in parallel.

Every step with a temperature, time, cooking mode, quantity, conditional, or doneness/safety cue must include a concise `card_detail` that preserves that critical information for compact visual rendering. Use `null` only when the step has no such detail. Never infer a missing temperature or time. During validation, compare `text` against `card_detail`; if a temperature, time, mode, quantity, or safety/doneness cue appears in `text` but is absent from `card_detail`, set `validation.needs_review` to `true` and report the omission in `validation.issues`.

## Visual row ordering

The `ingredients` array is also the renderer's left-to-right/vertical row order. Do not preserve the source's section order when it conflicts with the cooking sequence. Order ingredients by the first instruction step in which each ingredient is used; use their original order as the tie-breaker. This puts ingredients added late (for example, a garnish or a final fold-in) near the bottom of the card even if they appeared earlier in the source list.

Every ingredient must include `row_order` (1-based visual position) and `first_use_step` (the 1-based step where it is first used). If an ingredient is only mentioned in notes, or no logical step can be inferred for an optional ingredient, set `first_use_step` to `null` and place it after all used ingredients. Keep `component_id` unchanged so source/component membership remains available independently of visual row order.

## Quantity parsing

Use `quantity.value` for a single numeric value and `quantity.min`/`quantity.max` for a range. Use the original unit text (`g`, `tbsp`, `tsp`, etc.). Fractions may be numeric when unambiguous, but always retain the exact source expression in `quantity.display`. For quantities such as “black pepper, to taste,” set `value` to `null` and preserve the phrase in `display`.

## Relationship handling

Each step input is either `{ "type": "ingredient", "id": "..." }` or `{ "type": "component", "id": "..." }`. Each output uses the same shape. For an ingredient that is prepared and then used later, keep the ingredient as the input to the preparation step and output a component only when the recipe names or clearly creates a reusable mixture. An ingredient can occur in multiple steps; this is required for “divided” or staged additions. A component input represents the portion produced so far, not ingredients that have not yet been used; the renderer uses `first_use_step` to calculate this boundary.

## Validation

Check that every referenced ID exists, step order starts at 1 and is sequential, every ingredient belongs to a component, `row_order` is unique and sequential, every `first_use_step` points to a valid step or is `null`, every listed instruction is represented by a step, every timeline task has at least one valid `source_step_id`, every timeline dependency references an existing task, and every dependency relationship is one of the supported values. Put any failure in `validation.issues` using plain language. Do not repair the source silently.

For the full JSON shape and a worked example, read [schema.md](references/schema.md).
