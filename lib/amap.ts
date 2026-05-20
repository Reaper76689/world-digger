export type PlaceCandidate = {
  amapPoiId?: string;
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
};

type NominatimPlace = {
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
};

const fallbackPlaces: PlaceCandidate[] = [
  {
    amapPoiId: "osm-fallback-west-lake",
    name: "杭州西湖风景名胜区",
    address: "浙江省杭州市西湖区龙井路1号",
    city: "杭州市",
    lat: 30.2425,
    lng: 120.1415
  },
  {
    amapPoiId: "osm-fallback-sanlitun",
    name: "三里屯",
    address: "北京市朝阳区三里屯",
    city: "北京市",
    lat: 39.937492,
    lng: 116.455294
  },
  {
    amapPoiId: "osm-fallback-sjtu",
    name: "上海交通大学 闵行校区",
    address: "上海市闵行区东川路800号",
    city: "上海市",
    lat: 31.025626,
    lng: 121.436882
  }
];

export async function searchAmapPlaces(query: string): Promise<PlaceCandidate[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "12");
  url.searchParams.set("accept-language", "zh-CN,zh,en");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "ShitanMapSocial/0.1 (local development)"
      },
      next: { revalidate: 300 }
    });
  } catch {
    return fallbackSearch(query);
  }

  if (!response.ok) return fallbackSearch(query);

  const data = (await response.json()) as NominatimPlace[];
  const places: PlaceCandidate[] = [];
  for (const place of data) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const city =
      place.address?.city ??
      place.address?.town ??
      place.address?.village ??
      place.address?.municipality ??
      place.address?.state ??
      place.address?.country;
    const name = place.name || place.display_name?.split(",")[0] || query;
    places.push({
      amapPoiId: place.osm_type && place.osm_id ? `osm-${place.osm_type}-${place.osm_id}` : undefined,
      name,
      address: place.display_name,
      city,
      lat,
      lng
    });
  }
  return places;
}

function fallbackSearch(query: string) {
  return fallbackPlaces.filter((place) => `${place.name}${place.address}${place.city}`.includes(query));
}
