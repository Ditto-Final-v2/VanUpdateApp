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
  coverImage: string;
  coverImageAlt: string;
  photos: TripPhoto[];
  notificationTitle: string;
  status: PostStatus;
  tripDay: number;
  mileageToDate: number;
}

export type RouteGeoJSON = GeoJSON.Feature<GeoJSON.LineString>;
