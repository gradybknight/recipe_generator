# Meal-plan timeline

## Goal

Build a combined timeline for multiple recipes so a cook can choose a shared serving target and see when to start each task.

Example:

- `Upgraded Mediterranean Chicken Salad` and `Sparkling Orange Espresso (Espresso Spritz)` should be ready together.
- `Stovetop Chocolate Pots de Crème (with Cocoa)` should be ready 30 minutes later.

## Feasibility

This is feasible as a deterministic scheduling feature. The existing recipe timeline is already a useful foundation because it contains tasks, lanes, durations, and dependencies. A meal plan can combine the task graphs from several recipes and add cross-recipe finish-time constraints.

An LLM is not required while scheduling. Once recipe timelines are structured and validated, the application should calculate the schedule with ordinary graph and constraint-solving logic. This makes the result reproducible, inspectable, and easier to warn about when timing is uncertain.

An LLM may still be useful upstream to:

- Extract tasks and dependencies from recipe prose.
- Suggest active-task durations when the source provides no timing.
- Classify steps as active work or passive waiting.
- Identify likely readiness events and parallel work.

Those suggestions should remain marked as inferred or uncertain rather than being silently treated as authoritative.

## Current timeline data

Recipe timelines currently provide most of the basic scheduling primitives:

- `id` and `label` for each task.
- `lane` for grouping parallel work.
- `start` offsets in some recipes.
- `duration_min` and `duration_max`.
- `depends_on` relationships, including finish-to-start and start-to-start.
- `source_step_ids` for traceability.
- `inferred` and `duration_source` metadata.
- Notes describing parallel-prep guidance.

The current renderer schedules each recipe independently. It uses `duration_max` for chart placement and falls back to 5 minutes when a duration is unspecified. That fallback is acceptable for drawing a rough chart, but it must not be used as an unannounced estimate for a meal plan.

## Gaps to resolve before meal planning

### Unspecified durations

The Mediterranean chicken salad has no durations for several important active tasks: chopping, dressing, tossing, folding, and tasting. Its cucumber rest and final chill are timed, but the total ready time is therefore uncertain.

A meal plan should either:

- Ask the user to supply missing durations.
- Use explicitly labeled default estimates.
- Produce a range and show the uncertainty.

### Implicit readiness

The current model does not explicitly say which task or event means that a recipe is ready to serve. The scheduler needs a readiness marker, for example:

```json
{
  "ready_event": "finish",
  "ready_task_id": "timeline-chill"
}
```

For the example recipes, readiness would likely be:

- Salad: after `timeline-chill`.
- Drink: after `timeline-layer`.
- Pots de crème: after `timeline-chill`.

### Mixed use of starts and dependencies

Some timelines encode sequencing through explicit `start` values, while others use `depends_on`. For reliable composition, dependencies should be the canonical representation. `start` can remain as a suggested initial layout or be converted into dependency relationships during normalization.

### Active versus passive work

Chilling is a long duration but does not require continuous attention. The model should distinguish active work from passive waiting so the scheduler can overlap it with other recipes without making the cook appear busy.

### Shared resources

Future scheduling may need constraints for resources such as:

- One cook or person.
- One oven or burner.
- A blender, mixer, or espresso machine.
- Refrigerator capacity.
- Counter space or required vessels.

Without resource constraints, the first version can assume that independent active tasks may overlap.

## Suggested task-model extensions

The existing structure could be extended without replacing it:

```json
{
  "id": "timeline-chill",
  "label": "Pour and chill",
  "lane": "Custard",
  "duration_min": 120,
  "duration_max": 120,
  "duration_source": "source",
  "inferred": false,
  "task_type": "passive",
  "resources": [],
  "depends_on": [
    {
      "task_id": "timeline-strain",
      "relationship": "finish-to-start"
    }
  ]
}
```

At the timeline level, add an explicit readiness definition:

```json
{
  "ready_task_id": "timeline-chill",
  "ready_event": "finish"
}
```

Useful optional fields include:

- `task_type`: `active`, `passive`, or `milestone`.
- `resources`: resources that are occupied while the task runs.
- `earliest_start` and `latest_start` for practical constraints.
- `duration_confidence` or a more detailed estimate source.
- `can_pause` when a task can safely be interrupted.
- `serving_window` when a dish is best served immediately or can wait.

## Meal-plan constraints

A meal plan should represent the user's intent separately from recipe tasks. For example:

```json
{
  "recipes": [
    {
      "recipe_id": "upgraded-mediterranean-chicken-salad",
      "ready_group": "main-and-drink"
    },
    {
      "recipe_id": "sparkling-orange-espresso-espresso-spritz",
      "ready_group": "main-and-drink"
    },
    {
      "recipe_id": "stovetop-chocolate-pots-de-creme-with-cocoa",
      "ready_offset_minutes": 30
    }
  ]
}
```

The scheduler can translate this into constraints such as:

```text
ready(salad) = ready(drink)
ready(dessert) = ready(salad) + 30 minutes
```

The user could optionally specify a serving time. If no serving time is supplied, the scheduler can choose the earliest feasible plan or present a relative schedule.

## Example with the current data

The drink's current timeline is approximately 5 minutes using its maximum durations:

- Build the orange base: 0–2 minutes.
- Add sparkling water: 2–3 minutes.
- Brew espresso in parallel: 0–3 minutes.
- Layer and serve: 3–5 minutes.

The dessert timeline is approximately 141 minutes from its current timeline origin. The final 120 minutes are chilling, so most of that time is passive.

The salad cannot currently be given a dependable exact duration. Its timed portions are:

- Cucumber preparation and rest: 10 minutes.
- Final chill: 20–30 minutes.

The active preparation between those steps is unspecified. Under the renderer's current 5-minute fallback, the salad would appear to take roughly 55 minutes, but that number should be treated only as a placeholder.

With an assumed salad ready time of `T`, the desired relationship is:

```text
ready(drink) = T
ready(salad) = T
ready(pots de creme) = T + 30 minutes
```

The dessert would need to begin early enough to account for its roughly 141-minute total timeline. The exact start time depends on whether the scheduler uses minimum, maximum, or user-selected durations and on the salad's missing estimates.

## Recommended implementation path

### Phase 1: Normalize individual timelines

Add a normalization layer that:

1. Validates task IDs and dependency references.
2. Converts `start`-based sequencing into explicit dependencies where possible.
3. Requires every schedulable task to have a duration policy.
4. Preserves whether timing is source-derived, inferred, or user-provided.
5. Identifies each recipe's ready task.

### Phase 2: Build a combined task graph

When recipes are selected:

1. Prefix task IDs with a recipe ID to prevent collisions.
2. Combine all normalized tasks into one graph.
3. Add cross-recipe readiness constraints.
4. Detect cycles and impossible constraints.

### Phase 3: Schedule

Start with a simple critical-path scheduler:

- Topologically order tasks.
- Calculate earliest starts from dependencies.
- Support forward scheduling when the user gives a start time.
- Support backward scheduling when the user gives a serving time.
- Use maximum durations for a conservative “latest likely finish” view.
- Optionally calculate a minimum-duration view and show the range.

Add resource-aware scheduling later using the task `resources` field.

### Phase 4: Explain uncertainty

The UI should clearly identify:

- Unspecified durations.
- Inferred durations.
- Timing ranges.
- Passive waiting periods.
- Resource conflicts.
- Any task that determines the meal's critical path.

The system should prefer saying “approximately” or showing a window over presenting a false exact time.

## Conclusion

The existing timeline structure is sufficient for a first meal-plan prototype after normalization and explicit readiness markers are added. No runtime LLM is needed. The main limitation is not the scheduling algorithm; it is the completeness and confidence of the recipe timing data.
