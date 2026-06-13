export function computeStats(events) {
  if (!events || events.length === 0) {
    return {
      totalKeystrokes: 0,
      deleteCount: 0,
      pasteCount: 0,
      editRatio: 0,
      durationMs: 0,
      lineCounts: {},
      phases: { thinking: 0, coding: 0, debugging: 0, testing: 0 },
    };
  }

  let totalKeystrokes = 0;
  let deleteCount = 0;
  let pasteCount = 0;
  const lineCounts = {};

  const phases = {
    thinking: 0,
    coding: 0,
    debugging: 0,
    testing: 0,
  };

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const durationMs = lastEvent.ts - firstEvent.ts;

  events.forEach((event, i) => {
    // Basic counts
    if (event.type === 'insert') totalKeystrokes++;
    if (event.type === 'delete') deleteCount++;
    if (event.type === 'paste') pasteCount++;

    // Line counts (for heatmap intensity)
    if (event.type === 'insert' || event.type === 'delete') {
      const line = event.line || 1;
      lineCounts[line] = (lineCounts[line] || 0) + 1;
    }

    // Phase detection
    if (i > 0) {
      const gap = event.ts - events[i - 1].ts;
      
      if (gap > 5000) {
        phases.thinking += gap;
      } else if (event.type === 'run') {
        phases.testing += gap;
      } else {
        // Look back up to 10 events to determine debugging vs coding
        const windowStart = Math.max(0, i - 10);
        const windowEvents = events.slice(windowStart, i);
        const deletesInWindow = windowEvents.filter(e => e.type === 'delete').length;
        const deleteRatio = windowEvents.length > 0 ? (deletesInWindow / windowEvents.length) : 0;
        
        if (deleteRatio > 0.5) {
          phases.debugging += gap;
        } else {
          phases.coding += gap;
        }
      }
    }
  });

  const editRatio = Math.round((deleteCount / (totalKeystrokes + deleteCount)) * 100) || 0;

  return {
    totalKeystrokes,
    deleteCount,
    pasteCount,
    editRatio,
    durationMs,
    lineCounts,
    phases,
  };
}
