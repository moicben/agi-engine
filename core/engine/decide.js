// Decide stage aggregates task-level critic outcomes and iteration status

export function decide({ iterationIndex, tasks, critics, retriesState, intent }) {
  // Determine next action: continue | retry | replan | halt
  // Simple policy MVP: if any critic next.action === 'retry' and retries available -> retry that task
  for (const c of critics) {
    if (c?.next?.action === 'retry') {
      const tid = c.task_id;
      const left = Math.max(0, (retriesState[tid]?.left ?? 0));
      if (left > 0) {
        return { stage: 'Decide', action: 'retry', task_id: tid, reason: 'critic_requested_retry' };
      }
    }
  }
  // If any critic suggests replan
  if (critics.some(c => c?.next?.action === 'replan')) {
    return { stage: 'Decide', action: 'replan', reason: 'critic_requested_replan' };
  }
  // If all tasks successful
  const allOk = critics.every(c => c?.success === true);
  if (allOk && critics.length === tasks.length) {
    return { stage: 'Decide', action: 'halt', reason: 'all_tasks_success' };
  }
  // Fast-path: for QA intent, if we have at least one successful result, halt
  if (intent === 'qa' && critics.some(c => c?.success === true)) {
    return { stage: 'Decide', action: 'halt', reason: 'qa_answer_provided' };
  }
  // Default continue
  return { stage: 'Decide', action: 'continue' };
}

export default { decide };


