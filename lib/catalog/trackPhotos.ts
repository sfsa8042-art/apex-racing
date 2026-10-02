export type TrackAngle = "aerial" | "corner" | "stands" | "pits" | "overview" | "action";

export interface TrackPhoto {
  file: string;
  angle: TrackAngle;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
  caption: { ru: string; en: string };
  alt: { ru: string; en: string };
}

/** Three real-world photographs per circuit — aerial + ground angles. */
export const trackPhotos: Record<string, TrackPhoto[]> = {
  monza: [
    {
      file: "monza-aerial", angle: "aerial",
      author: "Planet Labs, Inc.",
      source: "https://commons.wikimedia.org/wiki/File:Autodromo_Nazionale_Monza,_April_22,_2018_SkySat_(cropped).jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Спутниковый вид · Monza", en: "Satellite view · Monza" },
      alt: { ru: "Спутниковый снимок Autodromo Nazionale Monza", en: "Satellite photograph of Autodromo Nazionale Monza" },
    },
    {
      file: "monza-parabolica", angle: "corner",
      author: "United Autosports",
      source: "https://commons.wikimedia.org/wiki/File:2021_4_Hours_of_Monza_-_Parabolica.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Parabolica · уровень трассы", en: "Parabolica · track level" },
      alt: { ru: "Автомобили на выходе из Parabolica в Monza", en: "Cars exiting the Parabolica at Monza" },
    },
    {
      file: "monza-straight", angle: "stands",
      author: "Andrea Volpato",
      source: "https://commons.wikimedia.org/wiki/File:Blancpain_Gt_Series_Endurance_Cup_-_Autodromo_Nazionale_di_Monza_-_22-04-2018_(39883654680).jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Главная прямая · трибуны", en: "Main straight · grandstands" },
      alt: { ru: "Вид на главную прямую Monza с трибун", en: "View of the Monza main straight from the grandstands" },
    },
  ],
  spa: [
    {
      file: "spa-aerial", angle: "aerial",
      author: "Planet Labs, Inc.",
      source: "https://commons.wikimedia.org/wiki/File:Circuit_de_Spa-Francorchamps,_April_22,_2018_SkySat_(cropped).jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Спутниковый вид · Spa", en: "Satellite view · Spa" },
      alt: { ru: "Спутниковый снимок Circuit de Spa-Francorchamps", en: "Satellite photograph of Circuit de Spa-Francorchamps" },
    },
    {
      file: "spa-eau-rouge", angle: "corner",
      author: "United Autosports",
      source: "https://commons.wikimedia.org/wiki/File:2022_6_Hours_of_Spa-Francorchamps_-_Eau_Rouge_Corner.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Eau Rouge · уровень трассы", en: "Eau Rouge · track level" },
      alt: { ru: "Поворот Eau Rouge на Spa-Francorchamps", en: "Eau Rouge corner at Spa-Francorchamps" },
    },
    {
      file: "spa-overview", angle: "overview",
      author: "Nathanael Majoros",
      source: "https://commons.wikimedia.org/wiki/File:Spa-Francorchamps_overview.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Обзор трассы · холмы", en: "Circuit overview · hills" },
      alt: { ru: "Панорамный вид на Spa-Francorchamps среди холмов", en: "Panoramic overview of Spa-Francorchamps in the hills" },
    },
  ],
  silverstone: [
    {
      file: "silverstone-aerial", angle: "aerial",
      author: "Harvey Milligan",
      source: "https://commons.wikimedia.org/wiki/File:Silverstone_Racing_Circuit.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Вид сверху · Silverstone", en: "Elevated view · Silverstone" },
      alt: { ru: "Вид сверху на трассу Silverstone", en: "Elevated photograph of Silverstone Circuit" },
    },
    {
      file: "silverstone-copse", angle: "corner",
      author: "Ian S",
      source: "https://commons.wikimedia.org/wiki/File:Copse_Corner,_Silverstone_-_geograph.org.uk_-_4586571.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Copse · уровень трассы", en: "Copse · track level" },
      alt: { ru: "Поворот Copse на Silverstone", en: "Copse corner at Silverstone" },
    },
    {
      file: "silverstone-stands", angle: "stands",
      author: "Ian S",
      source: "https://commons.wikimedia.org/wiki/File:Copse_A_Stand,_Silverstone_-_geograph.org.uk_-_4586478.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Трибуна Copse A", en: "Copse A grandstand" },
      alt: { ru: "Трибуна у поворота Copse на Silverstone", en: "Grandstand at Copse corner, Silverstone" },
    },
  ],
  nurburgring: [
    {
      file: "nurburgring-aerial", angle: "aerial",
      author: "ADwarf",
      source: "https://commons.wikimedia.org/wiki/File:Nuerburgring_Luft_2011_05.jpg",
      license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      caption: { ru: "Аэрофото · Nürburgring", en: "Aerial · Nürburgring" },
      alt: { ru: "Аэрофотоснимок комплекса Nürburgring", en: "Aerial photograph of the Nürburgring complex" },
    },
    {
      file: "nurburgring-action", angle: "action",
      author: "Herranderssvensson",
      source: "https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_at_Nuerburgring.jpg",
      license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      caption: { ru: "GP-Strecke · гонка", en: "GP-Strecke · race action" },
      alt: { ru: "Гонка ADAC GT Masters на Nürburgring", en: "ADAC GT Masters racing at the Nürburgring" },
    },
    {
      file: "nurburgring-paddock", angle: "pits",
      author: "Cannoneer Photography",
      source: "https://commons.wikimedia.org/wiki/File:Historisches_Fahrerlager_N%C3%BCrburgring_Classic_2017.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Исторический паддок", en: "Historic paddock" },
      alt: { ru: "Исторический паддок Nürburgring Classic", en: "Historic paddock at the Nürburgring Classic" },
    },
  ],
  suzuka: [
    {
      file: "suzuka-aerial", angle: "aerial",
      author: "Planet Labs, Inc.",
      source: "https://commons.wikimedia.org/wiki/File:Suzuka_International_Racing_Course,_July_10,_2018_SkySat.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Спутниковый вид · Suzuka", en: "Satellite view · Suzuka" },
      alt: { ru: "Спутниковый снимок Suzuka International Racing Course", en: "Satellite photograph of Suzuka International Racing Course" },
    },
    {
      file: "suzuka-scurve", angle: "corner",
      author: "wata0929",
      source: "https://commons.wikimedia.org/wiki/File:Suzuka.s_curve.JPG",
      license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      caption: { ru: "S-Curves · уровень трассы", en: "S-Curves · track level" },
      alt: { ru: "S-Curves на трассе Suzuka", en: "The S-Curves at Suzuka Circuit" },
    },
    {
      file: "suzuka-pits", angle: "pits",
      author: "Tokumeigakarinoaoshima",
      source: "https://commons.wikimedia.org/wiki/File:Suzuka_Circuit_Pit_Building.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Пит-билдинг", en: "Pit building" },
      alt: { ru: "Пит-билдинг Suzuka Circuit", en: "Suzuka Circuit pit building" },
    },
  ],
  imola: [
    {
      file: "imola-action", angle: "action",
      author: "Grantuking",
      source: "https://commons.wikimedia.org/wiki/File:WTCC08_Dino_ed_Enzo_Ferrari_Circuit_Imola.jpg",
      license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      caption: { ru: "Трасса · уровень асфальта", en: "Circuit · asphalt level" },
      alt: { ru: "Гоночные автомобили на трассе Imola", en: "Touring cars on track at Imola" },
    },
    {
      file: "imola-grandstand", angle: "stands",
      author: "Daniele Costantini",
      source: "https://commons.wikimedia.org/wiki/File:Imola_Circuit,_1998_-_Grandstand.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Главная трибуна", en: "Main grandstand" },
      alt: { ru: "Главная трибуна Autodromo Enzo e Dino Ferrari", en: "Main grandstand at Autodromo Enzo e Dino Ferrari" },
    },
    {
      file: "imola-pits", angle: "pits",
      author: "Daniele Costantini",
      source: "https://commons.wikimedia.org/wiki/File:Imola_Circuit,_1998_-_Tower_and_pit_lane_exit.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Выезд с пит-лейна", en: "Pit-lane exit" },
      alt: { ru: "Башня и выезд с пит-лейна Imola", en: "Control tower and pit-lane exit at Imola" },
    },
  ],
  barcelona: [
    {
      file: "barcelona-aerial", angle: "aerial",
      author: "Planet Labs, Inc.",
      source: "https://commons.wikimedia.org/wiki/File:Circuit_de_Barcelona-Catalunya,_April_19,_2018_SkySat_(cropped).jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Спутниковый вид · Catalunya", en: "Satellite view · Catalunya" },
      alt: { ru: "Спутниковый снимок Circuit de Barcelona-Catalunya", en: "Satellite photograph of Circuit de Barcelona-Catalunya" },
    },
    {
      file: "barcelona-t1", angle: "corner",
      author: "Wilnel José Verdú Guerrero",
      source: "https://commons.wikimedia.org/wiki/File:Curvas_1-6_de_Circuit_de_Barcelona-Catalunya_Montmel%C3%B3_(2023).jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "T1–T6 · с холма", en: "T1–T6 · hillside view" },
      alt: { ru: "Повороты 1–6 Circuit de Barcelona-Catalunya", en: "Turns 1–6 at Circuit de Barcelona-Catalunya" },
    },
    {
      file: "barcelona-overview", angle: "overview",
      author: "Tony Hisgett",
      source: "https://commons.wikimedia.org/wiki/File:Circuit_of_Catalunya.jpg",
      license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      caption: { ru: "Обзор комплекса", en: "Complex overview" },
      alt: { ru: "Общий вид Circuit de Barcelona-Catalunya", en: "Overview of Circuit de Barcelona-Catalunya" },
    },
  ],
};

export const trackAngleLabel: Record<TrackAngle, { ru: string; en: string }> = {
  aerial: { ru: "Сверху", en: "Aerial" },
  corner: { ru: "Поворот", en: "Corner" },
  stands: { ru: "Трибуны", en: "Stands" },
  pits: { ru: "Питы", en: "Pits" },
  overview: { ru: "Обзор", en: "Overview" },
  action: { ru: "Гонка", en: "Action" },
};
