"use client";

import { useLang } from "@/context/LanguageContext";
import { carPhotos } from "@/lib/catalog/carPhotos";
import styles from "./Catalog.module.css";

export function CarPhoto({ carId, thumbnail = false }: { carId: string; thumbnail?: boolean }) {
  const { lang } = useLang();
  const photo = carPhotos[carId];
  // Local responsive WebP files are pre-encoded; no runtime image service is needed.
  const picture = <picture>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={`/images/cars/${photo.file}-${thumbnail ? 640 : 1200}.webp`}
      srcSet={[640, 1200, 1800].map(width => `/images/cars/${photo.file}-${width}.webp ${width}w`).join(", ")}
      sizes={thumbnail ? "(max-width: 767px) 215px, 300px" : "(max-width: 767px) calc(100vw - 32px), (max-width: 1000px) calc(100vw - 272px), (max-width: 1500px) calc(100vw - 580px), 1000px"}
      width={1800} height={1013} alt={thumbnail ? "" : photo.alt[lang]}
      loading={thumbnail ? "lazy" : "eager"} decoding="async"
    />
  </picture>;
  if (thumbnail) return <div className={styles.photoThumb}>{picture}</div>;
  return <figure className={styles.carPhoto}>
    {picture}
    <figcaption className={styles.photoCaption}>
      <span className={styles.photoLocation}>{photo.caption}</span>
      <span><a href={photo.source} target="_blank" rel="noreferrer">{lang === "ru" ? "Фото" : "Photo"}: {photo.author}</a> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></span>
      <span className={styles.photoEdit}>{lang === "ru" ? "Кадрирование и оптимизация WebP" : "Cropped and optimised as WebP"}</span>
    </figcaption>
  </figure>;
}
