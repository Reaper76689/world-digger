export type PlaceCandidate = {
  amapPoiId?: string;
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
};

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string | unknown[];
  cityname?: string;
  location?: string;
};

const fallbackPlaces: PlaceCandidate[] = [
  {
    amapPoiId: "mock-shanghai-jiaotong",
    name: "上海交通大学 闵行校区",
    address: "上海市闵行区东川路800号",
    city: "上海市",
    lat: 31.0252,
    lng: 121.4341
  },
  {
    amapPoiId: "mock-west-lake",
    name: "杭州西湖风景名胜区",
    address: "浙江省杭州市西湖区龙井路1号",
    city: "杭州市",
    lat: 30.2425,
    lng: 120.1415
  },
  {
    amapPoiId: "mock-sanlitun",
    name: "三里屯太古里",
    address: "北京市朝阳区三里屯路19号",
    city: "北京市",
    lat: 39.9369,
    lng: 116.4545
  }
];

export async function searchAmapPlaces(query: string): Promise<PlaceCandidate[]> {
  const key = process.env.AMAP_REST_KEY;
  if (!key) {
    return fallbackPlaces.filter((place) => {
      const haystack = `${place.name}${place.address}${place.city}`;
      return haystack.includes(query);
    });
  }

  const url = new URL("https://restapi.amap.com/v3/place/text");
  url.searchParams.set("key", key);
  url.searchParams.set("keywords", query);
  url.searchParams.set("extensions", "base");
  url.searchParams.set("offset", "12");
  url.searchParams.set("page", "1");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Amap search failed");
  }

  const data = (await response.json()) as { pois?: AmapPoi[] };
  const places: PlaceCandidate[] = [];
  for (const poi of data.pois ?? []) {
    const [lng, lat] = (poi.location ?? "").split(",").map(Number);
    if (!poi.name || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    places.push({
      amapPoiId: poi.id,
      name: poi.name,
      address: Array.isArray(poi.address) ? "" : poi.address,
      city: poi.cityname,
      lat,
      lng
    });
  }
  return places;
}
