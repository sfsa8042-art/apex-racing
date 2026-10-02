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
      file: "monza-chicane", angle: "corner",
      author: "crash71100",
      source: "https://commons.wikimedia.org/wiki/File:Autodromo_Nazionale_di_Monza,_first_chicane_-_Flickr_-_crash71100.jpg",
      license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      caption: { ru: "Первая шикана · сверху", en: "First chicane · elevated" },
      alt: { ru: "Первая шикана Autodromo Nazionale di Monza с триколорными поребриками", en: "First chicane at Autodromo Nazionale di Monza with tricolor kerbs" },
    },
    {
      file: "monza-ascari", angle: "stands",
      author: "Luca Barni",
      source: "https://commons.wikimedia.org/wiki/File:Ingresso_variante_ascari_Monza.jpg",
      license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      caption: { ru: "Variante Ascari · трибуны", en: "Variante Ascari · grandstands" },
      alt: { ru: "Вход в Variante Ascari на Monza с трибунами и мостом DHL", en: "Approach to Variante Ascari at Monza with grandstands and DHL bridge" },
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
      file: "spa-raidillon", angle: "corner",
      author: "Cutkiller2018",
      source: "https://commons.wikimedia.org/wiki/File:Kurve_Eau_Rouge-Raidillon.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Eau Rouge / Raidillon", en: "Eau Rouge / Raidillon" },
      alt: { ru: "Подъём Eau Rouge–Raidillon на Spa-Francorchamps", en: "Eau Rouge–Raidillon climb at Spa-Francorchamps" },
    },
    {
      file: "spa-stands", angle: "stands",
      author: "United Autosports",
      source: "https://commons.wikimedia.org/wiki/File:2022_6_Hours_of_Spa-Francorchamps_-_Eau_Rouge_Corner_stands.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Eau Rouge · с трибун", en: "Eau Rouge · from the stands" },
      alt: { ru: "Гонка у Eau Rouge, вид с трибун Spa", en: "Racing at Eau Rouge seen from the Spa grandstands" },
    },
  ],
  silverstone: [
    {
      file: "silverstone-noria", angle: "overview",
      author: "Jen Ross",
      source: "https://commons.wikimedia.org/wiki/File:2024_British_Grand_Prix,_noria.jpg",
      license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      caption: { ru: "Колесо обозрения · British GP", en: "Ferris wheel · British GP" },
      alt: { ru: "Silverstone в дождь с колесом обозрения и трибуной", en: "Silverstone in the rain with Ferris wheel and grandstand" },
    },
    {
      file: "silverstone-albon", angle: "action",
      author: "Jen Ross",
      source: "https://commons.wikimedia.org/wiki/File:2024_British_Grand_Prix,_Albon_(4).jpg",
      license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      caption: { ru: "British GP · на трассе", en: "British GP · on track" },
      alt: { ru: "Болид Формулы-1 на трассе Silverstone", en: "Formula 1 car on track at Silverstone" },
    },
    {
      file: "silverstone-gp2", angle: "corner",
      author: "via Flickr",
      source: "https://commons.wikimedia.org/wiki/File:2016_GP2_Series,_Silverstone_Circuit_(29655603691).jpg",
      license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      caption: { ru: "GP2 · поворот", en: "GP2 · corner" },
      alt: { ru: "Болид GP2 в повороте на Silverstone", en: "GP2 car through a corner at Silverstone" },
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
      file: "nurburgring-alpina", angle: "action",
      author: "Patrick Ch. Apfeld",
      source: "https://commons.wikimedia.org/wiki/File:GT_Masters_Alpina_1.jpg",
      license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      caption: { ru: "GT Masters · Alpina", en: "GT Masters · Alpina" },
      alt: { ru: "BMW Alpina GT3 на Nürburgring", en: "BMW Alpina GT3 racing at the Nürburgring" },
    },
    {
      file: "nurburgring-corvette", angle: "corner",
      author: "Patrick Ch. Apfeld",
      source: "https://commons.wikimedia.org/wiki/File:GT_Masters_Corvette_Z06_Frenzen.jpg",
      license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      caption: { ru: "GT Masters · Corvette", en: "GT Masters · Corvette" },
      alt: { ru: "Corvette GT3 на Nürburgring", en: "Corvette GT3 racing at the Nürburgring" },
    },
  ],
  suzuka: [
    {
      file: "suzuka-air", angle: "aerial",
      author: "carloshonda",
      source: "https://commons.wikimedia.org/wiki/File:A%C3%A9reo_do_Circuito_de_Suzuka_e_arredores_-_panoramio_(3).jpg",
      license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      caption: { ru: "Аэрофото · Suzuka", en: "Aerial · Suzuka" },
      alt: { ru: "Аэрофотоснимок Suzuka Circuit с колесом обозрения", en: "Aerial photograph of Suzuka Circuit with Ferris wheel" },
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
      file: "imola-start", angle: "overview",
      author: "Jmmuguerza",
      source: "https://commons.wikimedia.org/wiki/File:2025_Emilia_Romagna_Grand_Prix_03.jpg",
      license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      caption: { ru: "Старт-финиш · Emilia Romagna GP", en: "Start–finish · Emilia Romagna GP" },
      alt: { ru: "Стартовая прямая Imola с пит-комплексом и трибунами", en: "Imola start–finish straight with pit complex and grandstands" },
    },
    {
      file: "imola-pits", angle: "action",
      author: "Lilith 1981",
      source: "https://commons.wikimedia.org/wiki/File:European_Le_Mans_series_Imola_17-05-2015.jpg",
      license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      caption: { ru: "European Le Mans · пит-лейн", en: "European Le Mans · pit lane" },
      alt: { ru: "Прототипы European Le Mans Series у пит-лейна Imola", en: "European Le Mans Series prototypes at the Imola pit lane" },
    },
    {
      file: "imola-garage", angle: "pits",
      author: "Claudio Vosti",
      source: "https://commons.wikimedia.org/wiki/File:Imola_Aprile_2024.jpg",
      license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
      caption: { ru: "Паддок · работа с машиной", en: "Paddock · car work" },
      alt: { ru: "Механики у гоночного автомобиля в паддоке Imola", en: "Mechanics working on a race car in the Imola paddock" },
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
