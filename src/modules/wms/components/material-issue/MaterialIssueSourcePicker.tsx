import {
  AsyncSelect,
  type AsyncSelectOption,
} from "@/components/ui/async-select";

import type { WiredIssueType } from "../../api";
import {
  useOutwardSourcesInfinite,
  type OutwardSourceOption,
} from "../../hooks/material-issue/useOutwardSources";
import { MATERIAL_ISSUE_STRINGS as S } from "./material-issue.strings";
import { sourceOptionDescription } from "../shared/source-option-description";
import { SourceOptionTitle } from "../shared/SourceOptionTitle";

interface Props {
  issueType: WiredIssueType;
  value: AsyncSelectOption | null;
  onValueChange: (next: AsyncSelectOption | null) => void;
  disabled?: boolean;
}

// Map the wired MI issue type onto the WMS `dispatch_type` the outward-sources
// endpoint expects. That endpoint returns only dispatchable sources (pending
// pick qty > 0), so fully-fulfilled / demo-converted documents never appear —
// the user can no longer pick a source with nothing left to issue (which would
// otherwise fail later with "That line doesn't belong to the selected source
// document").
const ISSUE_TYPE_TO_DISPATCH_TYPE: Record<WiredIssueType, string> = {
  sale_issue: "sale_dispatch",
  demo_issue: "demo_dispatch",
  replacement_issue: "replacement_dispatch",
};

export function MaterialIssueSourcePicker({
  issueType,
  value,
  onValueChange,
  disabled,
}: Props) {
  const dispatchType = ISSUE_TYPE_TO_DISPATCH_TYPE[issueType];

  // AsyncSelect invokes `useOptions` as a hook. `dispatchType` is stable for
  // the component's lifetime — the call site remounts the picker (`key={
  // issueType}`) whenever the issue type changes — so this inline adapter is
  // rules-of-hooks safe.
  const useOptions = (search: string, opts?: { enabled?: boolean }) =>
    // `forIssue`: a Partially Approved order is dispatchable but cannot be
    // issued against (CP-626), so the issue form does not offer it.
    useOutwardSourcesInfinite(dispatchType, search, {
      enabled: opts?.enabled,
      forIssue: true,
    });

  // Name the document the search looks in, per issue type ("Search a sales
  // order…" vs "Search a demo request…"), falling back to the generic string.
  const placeholder =
    S.form.header.sourceDocPlaceholderByType[issueType] ??
    S.form.header.sourceDocPlaceholder;

  return (
    <AsyncSelect<OutwardSourceOption>
      value={value}
      onValueChange={onValueChange}
      useOptions={useOptions}
      toLabel={(row) => row.display_number}
      renderItem={(row) => (
        <SourceOptionTitle number={row.display_number} isRental={row.is_rental} />
      )}
      // Who the document is for — nobody remembers a number. The search
      // matches the customer's name too.
      getDescription={(row) =>
        sourceOptionDescription({
          who: row.account_name,
          partsSummary: row.parts_summary,
        })
      }
      placeholder={placeholder}
      searchPlaceholder={placeholder}
      searchable
      loadOnOpen
      disabled={disabled}
    />
  );
}
