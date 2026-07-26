export type PostStatus = "draft" | "published";

export interface TripPhoto {
  src: string;
  alt: string;
  caption: string;
}

export interface TripPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  entryDate: string;
  publishedAt: string;
  locationName: string;
  latitude: number;
  longitude: number;
  coverImage: string | null;
  coverImageAlt: string;
  photos: TripPhoto[];
  notificationTitle: string;
  status: PostStatus;
  tripDay: number;
  mileageToDate: number;
  milesDrivenThisEntry: number;
  milesWalked: number;
  milesRan: number;
  milesBiked: number;
  majorCitiesVisited: number;
  newStatesVisited: number;
  newNationalParksVisited: number;
  tanksOfGas: number;
  loopNumber?: 1 | 2;
}

export type RouteGeoJSON = GeoJSON.Feature<GeoJSON.LineString>;
