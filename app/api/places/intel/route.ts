import type { PlaceIntel } from "@/types/place-intel";

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
};

type WikiSummary = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "";
  const city = searchParams.get("city") ?? "";
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  const [weather, wiki] = await Promise.all([
    getWeather(lat, lng),
    getWikiSummary(name, city)
  ]);

  const links: PlaceIntel["links"] = [
    {
      label: "高德地图",
      url: `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}`
    },
    {
      label: "百度搜索",
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(`${name} ${city}`)}`
    },
    {
      label: "维基百科",
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(name)}`
    }
  ];

  return Response.json({ intel: { weather, wiki, links } satisfies PlaceIntel });
}

async function getWeather(lat: number, lng: number): Promise<PlaceIntel["weather"]> {
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { next: { revalidate: 600 } });
    if (!response.ok) return null;
    const data = (await response.json()) as WeatherResponse;
    const current = data.current;
    if (!current) return null;

    return {
      temperature: current.temperature_2m ?? null,
      humidity: current.relative_humidity_2m ?? null,
      windSpeed: current.wind_speed_10m ?? null,
      summary: weatherCodeText(current.weather_code),
      sourceUrl: "https://open-meteo.com/"
    };
  } catch {
    return null;
  }
}

async function getWikiSummary(name: string, city: string): Promise<PlaceIntel["wiki"]> {
  const candidates = [name, name.replace(/\s+/g, ""), city].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const response = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`, {
        next: { revalidate: 3600 }
      });
      if (!response.ok) continue;
      const data = (await response.json()) as WikiSummary;
      if (!data.extract || !data.title) continue;
      return {
        title: data.title,
        extract: data.extract,
        url: data.content_urls?.desktop?.page ?? `https://zh.wikipedia.org/wiki/${encodeURIComponent(candidate)}`
      };
    } catch {
      continue;
    }
  }

  return null;
}

function weatherCodeText(code?: number) {
  if (code === undefined) return "天气数据可用";
  if (code === 0) return "晴朗";
  if ([1, 2, 3].includes(code)) return "多云";
  if ([45, 48].includes(code)) return "有雾";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "有雨";
  if ([71, 73, 75, 85, 86].includes(code)) return "有雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天气变化中";
}
