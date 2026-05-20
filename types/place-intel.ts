export type PlaceIntel = {
  weather: {
    temperature: number | null;
    humidity: number | null;
    windSpeed: number | null;
    summary: string;
    sourceUrl: string;
  } | null;
  wiki: {
    title: string;
    extract: string;
    url: string;
  } | null;
  links: Array<{
    label: string;
    url: string;
  }>;
};
