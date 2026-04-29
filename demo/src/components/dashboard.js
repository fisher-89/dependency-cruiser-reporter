export function renderDashboard() {
  return "<div>Dashboard Widget</div>";
}

export function getDashboardLayout() {
  return { columns: 3, rows: 2, widgets: ["stats", "chart", "table"] };
}

export function updateWidget(widgetId, config) {
  return { widgetId, ...config, updatedAt: new Date() };
}
