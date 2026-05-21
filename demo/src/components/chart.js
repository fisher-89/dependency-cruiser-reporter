export function createBarChart(data, options = {}) {
  return { type: "bar", data, options, rendered: true };
}

export function createLineChart(data, options = {}) {
  return { type: "line", data, options, rendered: true };
}

export function createPieChart(data, options = {}) {
  return { type: "pie", data, options, rendered: true };
}
