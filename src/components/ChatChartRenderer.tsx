import type { ReactNode } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import { Tag } from "antd-mobile";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import "./ChatChartRenderer.scss";

interface ChartViewPayload {
  type?: string;
  title?: string;
  x_field?: string;
  y_field?: string;
  x_label?: string;
  y_label?: string;
  series_field?: string;
  sql?: string;
  data?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface ParsedContent {
  text: string;
  chartViews: ChartViewPayload[];
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseChartViewContent(content: string): ParsedContent {
  const chartViews: ChartViewPayload[] = [];

  const chartViewText = content.replace(
    /<chart-view\s+content="([\s\S]*?)"\s*\/?>(?:<\/chart-view>)?/gi,
    (_match, encoded) => {
      try {
        const decoded = decodeHtmlEntities(encoded);
        chartViews.push(JSON.parse(decoded) as ChartViewPayload);
        return "\n\n";
      } catch {
        return "\n\n";
      }
    }
  );

  const text = chartViewText.replace(/```\s*vis-chart\s*([\s\S]*?)```/gi, (_match, rawChart) => {
    try {
      chartViews.push(JSON.parse(rawChart.trim()) as ChartViewPayload);
      return "\n\n";
    } catch {
      return `\n\n${rawChart.trim()}\n\n`;
    }
  });

  return {
    text: text.trim(),
    chartViews,
  };
}

const CHART_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function createAdaptiveYAxisBounds(seriesData: Array<Array<number | null>>) {
  const values = seriesData
    .flat()
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length) {
    return {};
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  if (range === 0) {
    const padding = Math.max(Math.abs(minValue) * 0.02, 1);
    return {
      min: minValue - padding,
      max: maxValue + padding,
      scale: true,
    };
  }

  const padding = Math.max(range * 0.12, 1);
  return {
    min: minValue - padding,
    max: maxValue + padding,
    scale: true,
  };
}

function getChartOption(chartView: ChartViewPayload): EChartsOption | null {
  const rows = Array.isArray(chartView.data) ? chartView.data : [];
  if (!rows.length) {
    return null;
  }

  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  if (!keys.length) {
    return null;
  }

  const numericKeys = keys.filter((key) => rows.some((row) => toNumber(row[key]) !== null));
  const textKeys = keys.filter((key) => !numericKeys.includes(key));
  const chartType = String(chartView.type || "table").toLowerCase();

  const configuredXField =
    typeof chartView.x_field === "string" && keys.includes(chartView.x_field)
      ? chartView.x_field
      : undefined;
  const configuredYField =
    typeof chartView.y_field === "string" && keys.includes(chartView.y_field)
      ? chartView.y_field
      : undefined;
  const configuredSeriesField =
    typeof chartView.series_field === "string" && keys.includes(chartView.series_field)
      ? chartView.series_field
      : undefined;

  const chartTitle = typeof chartView.title === "string" ? chartView.title : undefined;
  const xAxisLabel =
    typeof chartView.x_label === "string" ? chartView.x_label : configuredXField ?? undefined;
  const yAxisLabel =
    typeof chartView.y_label === "string" ? chartView.y_label : configuredYField ?? undefined;

  if (["line", "area", "bar", "column"].includes(chartType)) {
    const categoryKey = configuredXField ?? textKeys[0] ?? keys[0];
    const primaryValueKey = configuredYField ?? numericKeys.find((key) => key !== categoryKey);
    const isBarChart = chartType === "bar" || chartType === "column";
    const isAreaChart = chartType === "area";
    const seriesKey = configuredSeriesField;
    const chartSeriesType: "bar" | "line" = isBarChart ? "bar" : "line";

    if (!primaryValueKey) {
      return null;
    }

    const categories = Array.from(
      new Set(rows.map((row, index) => String(row[categoryKey] ?? index + 1)))
    );
    const seriesValues = seriesKey
      ? Array.from(new Set(rows.map((row) => String(row[seriesKey] ?? "未分组"))))
      : null;

    const series =
      seriesValues && seriesKey
        ? seriesValues.map((seriesName) => ({
            name: seriesName,
            type: chartSeriesType,
            smooth: !isBarChart,
            areaStyle: isAreaChart ? {} : undefined,
            data: categories.map((category) => {
              const matched = rows.find(
                (row) =>
                  String(row[categoryKey] ?? "") === category &&
                  String(row[seriesKey] ?? "未分组") === seriesName
              );
              return matched ? (toNumber(matched[primaryValueKey]) ?? 0) : null;
            }),
          }))
        : [
            {
              name: primaryValueKey,
              type: chartSeriesType,
              smooth: !isBarChart,
              areaStyle: isAreaChart ? {} : undefined,
              data: categories.map((category) => {
                const matched = rows.find((row) => String(row[categoryKey] ?? "") === category);
                return matched ? (toNumber(matched[primaryValueKey]) ?? 0) : null;
              }),
            },
          ];

    const seriesData = series.map((item) => item.data);
    const yAxisBounds = createAdaptiveYAxisBounds(seriesData);

    return {
      color: CHART_COLORS,
      title: chartTitle
        ? { text: chartTitle, left: "center", textStyle: { color: "#0f172a", fontSize: 15, fontWeight: 600 } }
        : undefined,
      tooltip: { trigger: "axis" },
      legend: series.length > 1 ? { bottom: 0 } : undefined,
      grid: {
        left: 32,
        right: 16,
        top: chartTitle ? 56 : 24,
        bottom: series.length > 1 ? 48 : 24,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: categories,
        name: xAxisLabel,
        nameLocation: "middle",
        nameGap: 34,
        axisLabel: { color: "#64748b" },
      },
      yAxis: {
        type: "value",
        name: yAxisLabel,
        nameLocation: "middle",
        nameGap: 46,
        ...yAxisBounds,
        axisLabel: { color: "#64748b" },
        splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
      },
      series,
    };
  }

  if (chartType === "pie") {
    const labelKey = configuredXField ?? textKeys[0] ?? keys[0];
    const valueKey = configuredYField ?? numericKeys[0];

    if (!valueKey) {
      return null;
    }

    return {
      color: CHART_COLORS,
      title: chartTitle
        ? { text: chartTitle, left: "center", textStyle: { color: "#0f172a", fontSize: 15, fontWeight: 600 } }
        : undefined,
      tooltip: { trigger: "item" },
      legend: { bottom: 0 },
      series: [
        {
          type: "pie",
          radius: ["36%", "70%"],
          itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
          data: rows.map((row, index) => ({
            name: String(row[labelKey] ?? `数据${index + 1}`),
            value: toNumber(row[valueKey]) ?? 0,
          })),
        },
      ],
    };
  }

  if (chartType === "scatter") {
    const xKey = configuredXField ?? numericKeys[0];
    const yKey = configuredYField ?? numericKeys.find((key) => key !== xKey);

    if (!xKey || !yKey) {
      return null;
    }

    return {
      color: CHART_COLORS,
      title: chartTitle
        ? { text: chartTitle, left: "center", textStyle: { color: "#0f172a", fontSize: 15, fontWeight: 600 } }
        : undefined,
      tooltip: { trigger: "item" },
      grid: { left: 32, right: 16, top: chartTitle ? 56 : 24, bottom: 24, containLabel: true },
      xAxis: {
        type: "value",
        name: xAxisLabel ?? xKey,
        nameLocation: "middle",
        nameGap: 32,
        axisLabel: { color: "#64748b" },
      },
      yAxis: {
        type: "value",
        name: yAxisLabel ?? yKey,
        nameLocation: "middle",
        nameGap: 40,
        axisLabel: { color: "#64748b" },
        splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
      },
      series: [
        {
          type: "scatter",
          symbolSize: 12,
          data: rows
            .map((row) => {
              const x = toNumber(row[xKey]);
              const y = toNumber(row[yKey]);
              return x === null || y === null ? null : [x, y];
            })
            .filter((item): item is [number, number] => item !== null),
        },
      ],
    };
  }

  return null;
}

function buildTableColumns(rows: Array<Record<string, unknown>>) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return keys.map((key) => ({
    title: key,
    dataIndex: key,
    key,
    render: (value: unknown) => {
      if (value === null || value === undefined || value === "") {
        return "-";
      }
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    },
  }));
}

function stripCodeAndHtml(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/<html[\s\S]*?<\/html>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  cleaned = cleaned.replace(/import\s+[\w.*{}\s,]+\s+from\s+['"][^'"]+['"]/g, "");
  cleaned = cleaned.replace(
    /(?:^|\n)\s*(?:import|from|def|class|plt\.|fig\.|ax\.|print\(|\.savefig|\.close)\b[^\n]*/g,
    ""
  );
  cleaned = cleaned.replace(/data\s*=\s*\{[\s\S]*?\}\s*$/gm, "");
  cleaned = cleaned.replace(/(?:生成的图片URL|File not found|Traceback)[^\n]*/g, "");
  cleaned = cleaned.replace(/\/images\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|svg|webp)/g, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

function renderPlainText(content: string): ReactNode {
  const cleaned = stripCodeAndHtml(content);
  if (!cleaned) {
    return null;
  }

  return (
    <View className="chat-markdown-fallback" style={{ whiteSpace: "pre-wrap" }}>
      {cleaned}
    </View>
  );
}

interface SimpleTableProps {
  columns: Array<{ title: string; dataIndex: string; render: (value: unknown) => string }>;
  dataSource: Array<Record<string, unknown>>;
}

function SimpleTable({ columns, dataSource }: SimpleTableProps) {
  if (!dataSource.length || !columns.length) {
    return null;
  }

  return (
    <ScrollView scrollX className="chart-table-scroll">
      <View className="chart-table">
        <View className="chart-table-header">
          {columns.map((col) => (
            <View key={col.dataIndex} className="chart-table-cell chart-table-header-cell">
              <Text className="chart-table-text">{col.title}</Text>
            </View>
          ))}
        </View>
        {dataSource.slice(0, 10).map((row, rowIndex) => (
          <View key={rowIndex} className="chart-table-row">
            {columns.map((col) => (
              <View key={col.dataIndex} className="chart-table-cell">
                <Text className="chart-table-text">{col.render(row[col.dataIndex])}</Text>
              </View>
            ))}
          </View>
        ))}
        {dataSource.length > 10 && (
          <View className="chart-table-more">
            <Text className="chart-table-more-text">... 共 {dataSource.length} 条数据</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function renderChartViews(chartViews: ChartViewPayload[]): ReactNode {
  return chartViews.map((chartView, index) => {
    const rows = Array.isArray(chartView.data) ? chartView.data : [];
    const columns = rows.length ? buildTableColumns(rows) : [];
    const chartOption = getChartOption(chartView);
    const chartTypeLabel = chartView.type ? String(chartView.type).toUpperCase() : "CHART";

    return (
      <View key={`${chartView.type || "chart"}-${index}`} className="chat-chart-card">
        <View className="chart-card-header">
          <Tag color="primary">{chartTypeLabel}</Tag>
          {chartView.sql ? (
            <Text className="chart-card-subtitle">已生成数据分析结果</Text>
          ) : null}
        </View>
        {chartOption ? (
          <View className="chart-container">
            <ReactECharts option={chartOption} style={{ height: 320, width: "100%" }} />
          </View>
        ) : null}
        {rows.length ? (
          <SimpleTable columns={columns} dataSource={rows} />
        ) : (
          <View className="chat-markdown-fallback" style={{ whiteSpace: "pre-wrap" }}>
            <Text>{chartView.sql ? "已生成数据分析" : "已生成可视化图表"}</Text>
          </View>
        )}
      </View>
    );
  });
}

interface ChatChartRendererProps {
  content: string;
}

export default function ChatChartRenderer({ content }: ChatChartRendererProps) {
  const parsedContent = parseChartViewContent(content);

  const formatText = (text: string) => {
    const cleaned = stripCodeAndHtml(text);
    if (!cleaned) {
      return null;
    }
    return cleaned.split("\n").map((line, i) => {
      if (!line.trim()) {
        return <Text key={i} className="chat-rich-paragraph">{"\n"}</Text>;
      }
      return (
        <Text key={`p-${i}`} className="chat-rich-paragraph">
          {line}
          {"\n"}
        </Text>
      );
    });
  };

  if (parsedContent.chartViews.length > 0) {
    const textContent = formatText(parsedContent.text);
    return (
      <View className="chat-rich-content">
        {textContent && <View className="chat-text-content">{textContent}</View>}
        {renderChartViews(parsedContent.chartViews)}
      </View>
    );
  }

  return renderPlainText(content);
}