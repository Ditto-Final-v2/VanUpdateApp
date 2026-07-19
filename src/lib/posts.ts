import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { TripPost, TripPhoto } from "@/types";

type PhotoRow = { storage_path: string; alt_text: string; caption: string | null; sort_order: number };
type PostRow = {
  id: string; slug: string; title: string; excerpt: string; body: string;
  entry_date: string; published_at: string; location_name: string;
  latitude: number; longitude: number; cover_image_path: string | null;
  cover_image_alt: string | null; notification_title: string | null;
  status: "published"; trip_day: number; mileage_to_date: number; loop_number: 1|2;
  post_photos: PhotoRow[] | null;
};

const postColumns = "id,slug,title,excerpt,body,entry_date,published_at,location_name,latitude,longitude,cover_image_path,cover_image_alt,notification_title,status,trip_day,mileage_to_date,loop_number,post_photos(storage_path,alt_text,caption,sort_order)";

async function addSignedPhotos(rows: PostRow[]): Promise<TripPost[]> {
  const supabase = await createClient();
  const paths = [...new Set(rows.flatMap((row) => [row.cover_image_path, ...(row.post_photos ?? []).map((photo) => photo.storage_path)]).filter((path): path is string => Boolean(path)))];
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("trip-photos").createSignedUrls(paths, 60 * 60);
    data?.forEach((item) => { if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl); });
  }
  return rows.map((row) => {
    const photos: TripPhoto[] = (row.post_photos ?? []).sort((a, b) => a.sort_order - b.sort_order).flatMap((photo) => {
      const src = urlByPath.get(photo.storage_path);
      return src ? [{ src, alt: photo.alt_text, caption: photo.caption ?? "" }] : [];
    });
    return {
      id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt,
      body: row.body.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
      entryDate: row.entry_date, publishedAt: row.published_at,
      locationName: row.location_name, latitude: row.latitude, longitude: row.longitude,
      coverImage: row.cover_image_path ? urlByPath.get(row.cover_image_path) ?? null : null,
      coverImageAlt: row.cover_image_alt ?? `${row.title} journal cover`, photos,
      notificationTitle: row.notification_title ?? row.title, status: row.status,
      tripDay: row.trip_day, mileageToDate: row.mileage_to_date, loopNumber:row.loop_number,
    };
  });
}

export const getPublishedPosts = cache(async (): Promise<TripPost[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(postColumns).eq("status", "published").lte("published_at", new Date().toISOString()).order("entry_date", { ascending: false }).order("published_at", { ascending: false });
  if (error || !data) return [];
  return addSignedPhotos(data as unknown as PostRow[]);
});

export const getPostBySlug = cache(async (slug: string) => {
  const posts = await getPublishedPosts();
  return posts.find((post) => post.slug === slug);
});

export async function getAdjacentPosts(slug: string) {
  const posts = await getPublishedPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  return { newer: index > 0 ? posts[index - 1] : undefined, older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined };
}

export interface AdminPost {
  id: string; title: string; entryDate: string; locationName: string; vanMileage: number;
  milesWalked: number; milesRan: number; milesBiked: number; majorCitiesVisited: number;
  newStatesVisited: number; newNationalParksVisited: number; tanksOfGas: number;
  notificationHook: string; body: string; status: "draft" | "published";
  latitude:number;longitude:number;loopNumber:1|2;
  photos: Array<{ path: string; url: string; alt: string; caption:string }>; coverImagePath: string | null;
}

const adminColumns = "id,title,entry_date,location_name,latitude,longitude,loop_number,van_mileage,miles_walked,miles_ran,miles_biked,major_cities_visited,new_states_visited,new_national_parks_visited,tanks_of_gas,notification_title,body,status,cover_image_path,post_photos(storage_path,alt_text,caption,sort_order)";

export async function getAdminPosts() {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("id,title,entry_date,status").order("entry_date", { ascending: false }).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAdminPostById(id: string): Promise<AdminPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(adminColumns).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as {
    id:string; title:string; entry_date:string; location_name:string; latitude:number;longitude:number;loop_number:1|2;van_mileage:number;
    miles_walked:number; miles_ran:number; miles_biked:number; major_cities_visited:number;
    new_states_visited:number; new_national_parks_visited:number; tanks_of_gas:number;
    notification_title:string|null; body:string; status:"draft"|"published"; cover_image_path:string|null;
    post_photos:Array<{storage_path:string;alt_text:string;caption:string|null;sort_order:number}>|null;
  };
  const photoRows = (row.post_photos ?? []).sort((a,b) => a.sort_order-b.sort_order);
  const { data: signed } = photoRows.length ? await supabase.storage.from("trip-photos").createSignedUrls(photoRows.map((photo) => photo.storage_path), 3600) : { data: [] };
  const urls = new Map((signed ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path,item.signedUrl] as const] : []));
  return { id:row.id,title:row.title,entryDate:row.entry_date,locationName:row.location_name,latitude:row.latitude,longitude:row.longitude,loopNumber:row.loop_number,vanMileage:row.van_mileage,
    milesWalked:Number(row.miles_walked),milesRan:Number(row.miles_ran),milesBiked:Number(row.miles_biked),majorCitiesVisited:row.major_cities_visited,
    newStatesVisited:row.new_states_visited,newNationalParksVisited:row.new_national_parks_visited,tanksOfGas:Number(row.tanks_of_gas),
    notificationHook:row.notification_title??"",body:row.body,status:row.status,coverImagePath:row.cover_image_path,
    photos:photoRows.flatMap((photo) => { const url=urls.get(photo.storage_path); return url ? [{path:photo.storage_path,url,alt:photo.alt_text,caption:photo.caption??""}] : []; }) };
}
