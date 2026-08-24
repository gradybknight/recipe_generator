export interface Quantity {
  value: number | null
  min: number | null
  max: number | null
  unit: string | null
  display: string | null
  qualifier: string | null
}

export interface Component {
  id: string
  name: string
}

export interface Ingredient {
  id: string
  component_id: string
  row_order: number
  first_use_step: number | null
  display: string
  quantity: Quantity
  name: string
  prep: string | null
  optional: boolean
}

export type StepTokenType = 'ingredient' | 'component'

export interface StepToken {
  type: StepTokenType
  id: string
}

export interface Step {
  id: string
  order: number
  text: string
  card_label: string | null
  card_detail: string | null
  inputs: StepToken[]
  outputs: StepToken[]
}

export type TimelineRelationship = 'finish-to-start' | 'start-to-start' | 'finish-to-finish'

export interface TimelineDependency {
  task_id: string
  relationship: TimelineRelationship
}

export type DurationSource = 'source' | 'unspecified' | 'inferred'

export interface TimelineTask {
  id: string
  label: string
  lane: string
  source_step_ids: string[]
  duration_min: number | null
  duration_max: number | null
  duration_source: DurationSource
  inferred: boolean
  depends_on: TimelineDependency[]
  start?: number
}

export interface Timeline {
  summary: string
  tasks: TimelineTask[]
  notes?: string[]
}

export interface Note {
  id: string
  text: string
  related_ids: string[]
}

export interface Validation {
  needs_review: boolean
  issues: string[]
}

export interface Recipe {
  schema_version: string
  title: string
  servings: { display: string }
  components: Component[]
  ingredients: Ingredient[]
  steps: Step[]
  timeline?: Timeline
  notes: Note[]
  validation: Validation
}
