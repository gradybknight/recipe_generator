# Recipe-card JSON contract

The contract is presentation-neutral. The SPA can render ingredients as rows, steps as columns or boxes, and relationships as arrows/brackets without asking an LLM to interpret anything.

```json
{
  "schema_version": "1.0",
  "title": "string",
  "servings": { "display": "string" },
  "components": [{ "id": "component-1", "name": "string" }],
  "ingredients": [{
    "id": "ingredient-1",
    "component_id": "component-1",
    "row_order": 1,
    "first_use_step": 1,
    "display": "string",
    "quantity": {
      "value": 0,
      "min": null,
      "max": null,
      "unit": "string",
      "display": "string",
      "qualifier": null
    },
    "name": "string",
    "prep": "string",
    "optional": false
  }],
  "steps": [{
    "id": "step-1",
    "order": 1,
    "text": "faithful instruction text",
    "card_label": "short label",
    "card_detail": "critical temperature, time, mode, or cue",
    "inputs": [{ "type": "ingredient", "id": "ingredient-1" }],
    "outputs": [{ "type": "component", "id": "component-1" }]
  }],
  "notes": [{ "id": "note-1", "text": "faithful note text", "related_ids": [] }],
  "validation": {
    "needs_review": false,
    "issues": []
  }
}
```

Required top-level fields are `schema_version`, `title`, `servings`, `components`, `ingredients`, `steps`, `notes`, and `validation`. Each ingredient also requires `row_order` and `first_use_step`. Each step requires `card_label` and `card_detail`; `card_detail` may be `null` when the step has no critical parameter. `quantity.value`, `min`, `max`, `unit`, `qualifier`, `prep`, and `card_label` may be `null` when not present or not safely parseable. `display` fields are always retained for faithful rendering. The ingredient array must be sorted by `row_order`.

## Worked example: relationship pattern

```json
{
  "schema_version": "1.0",
  "title": "Mediterranean Chopped Salad with Creamy Yogurt Dressing",
  "servings": { "display": "4 large salads or 6–8 side salads" },
  "components": [
    { "id": "component-salad", "name": "Salad" },
    { "id": "component-dressing", "name": "Creamy Yogurt Dressing" }
  ],
  "ingredients": [
    {
      "id": "ingredient-romaine",
      "component_id": "component-salad",
      "display": "2 romaine hearts, chopped",
      "quantity": { "value": 2, "min": null, "max": null, "unit": "hearts", "display": "2", "qualifier": null },
      "name": "romaine hearts",
      "prep": "chopped",
      "optional": false
    },
    {
      "id": "ingredient-yogurt",
      "component_id": "component-dressing",
      "display": "120 g whole-milk yogurt",
      "quantity": { "value": 120, "min": null, "max": null, "unit": "g", "display": "120 g", "qualifier": null },
      "name": "whole-milk yogurt",
      "prep": null,
      "optional": false
    }
  ],
  "steps": [
    {
      "id": "step-1",
      "order": 1,
      "text": "Chop the romaine and place it in a large salad bowl with the spinach and arugula.",
      "card_label": "Chop and combine greens",
      "card_detail": null,
      "inputs": [{ "type": "ingredient", "id": "ingredient-romaine" }],
      "outputs": [{ "type": "component", "id": "component-salad" }]
    },
    {
      "id": "step-2",
      "order": 2,
      "text": "Whisk together the yogurt, lemon juice, olive oil, Dijon mustard, garlic powder, oregano, salt, and black pepper until smooth.",
      "card_label": "Whisk dressing until smooth",
      "card_detail": "until smooth",
      "inputs": [{ "type": "ingredient", "id": "ingredient-yogurt" }],
      "outputs": [{ "type": "component", "id": "component-dressing" }]
    }
  ],
  "notes": [],
  "validation": {
    "needs_review": true,
    "issues": ["Abbreviated example: production output must include every ingredient and instruction."]
  }
}
```
