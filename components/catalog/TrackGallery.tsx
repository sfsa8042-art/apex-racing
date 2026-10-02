"use client";

import { useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { trackAngleLabel, trackPhotos } from "@/lib/catalog/trackPhotos";
import styles from "./Catalog.module.css";

export function TrackThumb({ trackId }: { trackId: string }) {
  const photos = trackPhotos[trackId];
  if (!photos?.length) return null;
  const photo = photos[0];
  return (
    <div className={styles.photoThumb}>
      <picture>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/tracks/${photo.file}-640.webp`}
          srcSet={`/images/tracks/${photo.file}-640.webp 640w, /images/tracks/${photo.file}-1200.webp 1200w`}
          sizes="(max-width: 767px) 215px, 300px"
          width={1200}
          height={675}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </picture>
    </div>
  );
}

export function TrackGallery({ trackId }: { trackId: string }) {
  const { lang } = useLang();
  const photos = trackPhotos[trackId] ?? [];
  const [index, setIndex] = useState(0);
  if (!photos.length) return null;

  const photo = photos[Math.min(index, photos.length - 1)];
  const angle = trackAngleLabel[photo.angle][lang];

  return (
    <figure className={styles.trackGallery}>
      <div className={styles.trackGalleryMain}>
        <picture>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photo.file}
            src={`/images/tracks/${photo.file}-1200.webp`}
            srcSet={[640, 1200, 1800].map(w => `/images/tracks/${photo.file}-${w}.webp ${w}w`).join(", ")}
            sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1000px) calc(100vw - 272px), (max-width: 1500px) calc(100vw - 580px), 1000px"
            width={1800}
            height={1013}
            alt={photo.alt[lang]}
            loading="eager"
            decoding="async"
          />
        </picture>
      </div>

      <div className={styles.trackAngles} role="tablist" aria-label={lang === "ru" ? "Ракурс" : "Angle"}>
        {photos.map((item, i) => (
          <button
            key={item.file}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={styles.trackAngle}
            onClick={() => setIndex(i)}
          >
            <span className={styles.trackAngleThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/tracks/${item.file}-640.webp`} alt="" width={160} height={90} loading="lazy" />
            </span>
            <span>{trackAngleLabel[item.angle][lang]}</span>
          </button>
        ))}
      </div>

      <figcaption className={styles.photoCaption}>
        <span className={styles.photoLocation}>{photo.caption[lang]} · {angle}</span>
        <span>
          <a href={photo.source} target="_blank" rel="noreferrer">
            {lang === "ru" ? "Фото" : "Photo"}: {photo.author}
          </a>
          {" · "}
          <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>
        </span>
        <span className={styles.photoEdit}>
          {lang === "ru" ? "Кадрирование и оптимизация WebP" : "Cropped and optimised as WebP"}
        </span>
      </figcaption>
    </figure>
  );
}
