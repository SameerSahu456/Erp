import { Navigate, useParams } from "react-router-dom";

/** The team was once its own page; old links land on the warehouse's Team tab. */
function WarehouseTeamPage() {
  const { id } = useParams();
  return <Navigate to={`/wms/locations/${id}?tab=team`} replace />;
}

export default WarehouseTeamPage;
