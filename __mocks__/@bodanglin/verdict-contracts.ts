// Manual mock for @bodanglin/verdict-contracts  
// This allows Jest to test the verifier without ESM import issues

import { z } from 'zod';

// Workflow step schema
const workflowStepSchema = z.object({
  id: z.string().optional(),
  action: z.enum(['answer', 'research', 'implement', 'review', 'verify', 'synthesis', 'specialist', 'human_approval', 'execute']),
  objective: z.string().optional(),
  parallel: z.boolean().optional(),
  required: z.boolean().optional(),
  verification: z.string().optional(),
}).strict();

const workflowSchema = z.object({
  steps: z.array(workflowStepSchema),
}).strict();

// Export the exact schemas we need
export const contractSchemas = {
  task_spec: z.object({
    objective: z.string().min(1),
    task_type: z.string().min(1),
    effort: z.enum(['unknown', 'low', 'medium', 'high']).default('unknown'),
    reasoning: z.enum(['unknown', 'low', 'medium', 'high']).default('unknown'),
    capabilities: z.array(z.string()).default([]),
    required_capabilities: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    context: z.record(z.unknown()).nullable().default(null),
    context_requirements: z.record(z.unknown()).default({}),
    tool_requirements: z.record(z.boolean()).default({}),
    privacy: z.enum(['unknown', 'public', 'internal', 'trusted_upstream', 'restricted']).default('unknown'),
    risk: z.enum(['unknown', 'low', 'medium', 'high', 'critical']).default('unknown'),
    budget: z.object({
      max_usd: z.number().optional(),
      estimated_usd: z.number().optional(),
      remaining_usd: z.number().optional(),
      estimated_tokens: z.number().optional(),
      estimated_latency_ms: z.number().optional(),
      estimate_basis: z.string().optional(),
    }).default({}),
    latency: z.object({
      max_ms: z.number().optional(),
    }).nullable().default(null),
    latency_limit_ms: z.number().nonnegative().nullable().default(null),
    workflow: workflowSchema.nullable().default(null),
    verification: z.string().nullable().default(null),
    parallelism: z.enum(['serial', 'concurrent']).default('serial'),
    destructive_operation: z.boolean().default(false),
    production_impact: z.boolean().default(false),
    criticality: z.enum(['unknown', 'low', 'medium', 'high']).default('unknown'),
    degraded_mode_policy: z.enum(['deny', 'allow']).default('deny'),
    approvals: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).default({}),
    schema_version: z.literal('1').default('1'),
  }).strict(),

  verification_plan: z.object({
    checks: z.array(z.unknown()),
    on_failure: z.string().optional(),
    schema_version: z.literal('1').default('1'),
  }).strict(),
};
