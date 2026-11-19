import { MaterialIssueFormBody } from "../../components/material-issue/MaterialIssueFormBody";

// Thin route wrapper — state lives in useMaterialIssueForm, layout in
// MaterialIssueFormBody (thin-controller pattern).
function MaterialIssueFormPage() {
  return <MaterialIssueFormBody />;
}

export { MaterialIssueFormPage };
export default MaterialIssueFormPage;
