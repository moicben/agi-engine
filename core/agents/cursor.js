// Minimal executor stub that just echoes tasks

export async function executeAssignments(assignments, options = {}) {
    // In MVP, we simply log and return a synthetic result
    return assignments.map((a) => ({ taskId: a.taskId, status: 'queued', executor: a.executor || 'cursor-cli' }));
}

export default { executeAssignments };


