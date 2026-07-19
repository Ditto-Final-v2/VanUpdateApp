import type { RouteGeoJSON } from "@/types";

export const completedRoute: RouteGeoJSON = {
  type: "Feature", properties: { name: "Completed route" },
  geometry: { type: "LineString", coordinates: [
    [-106.485, 31.7619], [-106.171, 32.7791], [-111.761, 34.8697],
    [-113.0263, 37.2982], [-111.2615, 38.2919], [-109.5498, 38.5733],
  ] },
};
