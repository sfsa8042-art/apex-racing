export interface CarPhoto {
  file: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
  caption: string;
  alt: { ru: string; en: string };
}

export const carPhotos: Record<string, CarPhoto> = {
  porsche_992_gt3r: {
    file: "porsche", author: "SmackJam",
    source: "https://commons.wikimedia.org/wiki/File:Wright_Porsche_WGI23_11.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    caption: "Watkins Glen · 2023",
    alt: { ru: "Porsche 992 GT3 R команды Wright Motorsports в повороте Watkins Glen", en: "Wright Motorsports Porsche 992 GT3 R cornering at Watkins Glen" },
  },
  ferrari_296_gt3: {
    file: "ferrari", author: "kallerna",
    source: "https://commons.wikimedia.org/wiki/File:2024_4_Hours_of_Le_Castellet_7.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    caption: "Le Castellet · 2024",
    alt: { ru: "Ferrari 296 GT3 на трассе Paul Ricard во время гонки в Ле-Кастелле", en: "Ferrari 296 GT3 racing at Circuit Paul Ricard in Le Castellet" },
  },
  bmw_m4_gt3: {
    file: "bmw", author: "DoomWarrior",
    source: "https://commons.wikimedia.org/wiki/File:Nick_Yelloly_BMW_M4_GT3_GT_World_Challenge_Hockenheim_2022.jpg",
    license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    caption: "Hockenheim · 2022",
    alt: { ru: "BMW M4 GT3 команды ROWE Racing на трассе Hockenheim", en: "ROWE Racing BMW M4 GT3 on track at Hockenheim" },
  },
  mercedes_amg_gt3: {
    file: "mercedes", author: "Osajus Photography",
    source: "https://commons.wikimedia.org/wiki/File:Korthoff_Preston_Motorsports%27s_Mercedes-AMG_GT3_Evo_during_the_2023_Petit_Le_Mans.jpg",
    license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    caption: "Petit Le Mans · 2023",
    alt: { ru: "Mercedes-AMG GT3 Evo команды Korthoff Preston Motorsports в гонке Petit Le Mans", en: "Korthoff Preston Motorsports Mercedes-AMG GT3 Evo racing at Petit Le Mans" },
  },
};
