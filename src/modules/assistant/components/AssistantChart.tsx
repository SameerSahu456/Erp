import { useMemo } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  ChartDefs,
  horizontalFill,
  PremiumTooltip,
} from "@/components/common/display/chartTheme";
import { Typography } from "@/components/ui/typography";

import { formatChartValue, shortenLabel } from "../lib/chartFormat";
import type { AssistantChart as AssistantChartData } from "../types";

const ROW_HEIGHT_PX = 30;
const CHART_PADDING_PX = 16;
const LABEL_WIDTH_PX = 118;
const VALUE_GUTTER_PX = 64;
const BAR_SIZE_PX = 16;
const BAR_RADIUS: [number, number, number, number] = [0, 6, 6, 0];
const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const VALUE_LABEL = { fontSize: 11, fill: "var(--foreground)" };
// Row highlight on hover — a theme token, so it stays subtle in light and dark.
const HOVER_CURSOR = { fill: "var(--muted)" };
const CHART_MARGIN = { top: 0, right: VALUE_GUTTER_PX, bottom: 0, left: 0 };

/** Horizontal bar chart for an assistant answer — one bar per group. */
export function AssistantChart({ chart }: { chart: AssistantChartData }) {
  const data = useMemo(
    () => chart.points.map((point) => ({ ...point, short: shortenLabel(point.label) })),
    [chart.points],
  );
  const format = (value: unknown) => formatChartValue(Number(value), chart.unit);

  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <Typography variant="eyebrow" tone="muted" asChild>
        <figcaption className="[overflow-wrap:anywhere]">{chart.title}</figcaption>
      </Typography>
      <div style={{ height: data.length * ROW_HEIGHT_PX + CHART_PADDING_PX }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={CHART_MARGIN}>
            <ChartDefs accents={["info"]} shadow={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="short"
              width={LABEL_WIDTH_PX}
              tickLine={false}
              axisLine={false}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={HOVER_CURSOR}
              content={
                <PremiumTooltip
                  formatter={(value) => [format(value), ""]}
                  labelFormatter={(label) =>
                    data.find((point) => point.short === label)?.label ?? String(label)
                  }
                />
              }
            />
            <Bar
              dataKey="value"
              fill={horizontalFill("info")}
              radius={BAR_RADIUS}
              barSize={BAR_SIZE_PX}
              isAnimationActive
            >
              <LabelList dataKey="value" position="right" formatter={format} style={VALUE_LABEL} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
