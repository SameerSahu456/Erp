import { useState } from "react";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

import { ASSISTANT_STRINGS as S } from "../assistant.strings";
import type { AssistantChart as AssistantChartData } from "../types";
import { AssistantChart } from "./AssistantChart";

type OfferState = "offered" | "shown" | "declined";

/**
 * Asks whether the user wants the answer as a chart, and shows it on yes.
 * Declining leaves a quiet "Show chart" link so the choice is never final.
 */
export function AssistantChartOffer({ chart }: { chart: AssistantChartData }) {
  const [state, setState] = useState<OfferState>("offered");

  if (state === "shown") {
    return (
      <div className="flex min-w-0 animate-slide-up flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
        <AssistantChart chart={chart} />
        <Button
          variant="ghost"
          size="xs"
          className="self-end"
          onClick={() => setState("declined")}
        >
          {S.chart.hide}
        </Button>
      </div>
    );
  }

  if (state === "declined") {
    return (
      <Button variant="ghost" size="xs" className="self-start" onClick={() => setState("shown")}>
        <BarChart3 className="size-3" aria-hidden />
        {S.chart.show}
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 animate-slide-up flex-wrap items-center gap-2 rounded-xl border border-info/20 bg-info/5 px-3 py-2">
      <BarChart3 className="size-4 shrink-0 text-info" aria-hidden />
      <Typography variant="body-sm" className="min-w-0 flex-1">
        {S.chart.offer}
      </Typography>
      <div className="flex shrink-0 gap-1.5">
        <Button size="xs" onClick={() => setState("shown")}>
          {S.chart.show}
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setState("declined")}>
          {S.chart.decline}
        </Button>
      </div>
    </div>
  );
}
