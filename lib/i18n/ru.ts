/**
 * Russian UI strings — complete dictionary for all interface elements.
 * Keys are semantic identifiers, values are natural Russian.
 */

export const ru = {
  // ─── Navigation ────────────────────────────────────────────────────────────
  nav: {
    dashboard: "Главная",
    telemetry: "Телеметрия",
    academy: "Академия",
    tracks: "Трассы",
    cars: "Автомобили",
    community: "Сообщество",
    soon: "Скоро",
    upgrade: "Улучшить",
    upgradeDesc: "Снимите ограничения: безлимитные загрузки и все модули Академии.",
  },

  // ─── Common ────────────────────────────────────────────────────────────────
  common: {
    yourLap: "Ваш круг",
    reference: "Референс",
    gap: "Разрыв",
    sector: "Сектор",
    upload: "Загрузить",
    analyze: "Анализировать",
    continue: "Продолжить",
    start: "Начать",
    review: "Повторить",
    learnFix: "Как исправить →",
    back: "Назад",
    close: "Закрыть",
    loading: "Загрузка...",
    processing: "Обработка...",
    save: "Сохранить",
    cancel: "Отмена",
    share: "Поделиться",
    export: "Экспорт",
    allTime: "За всё время",
    thisWeek: "На этой неделе",
    thisMonth: "В этом месяце",
    completed: "Завершено",
    inProgress: "В процессе",
    locked: "Заблокировано",
    available: "Доступно",
    noData: "Нет данных",
    error: "Ошибка",
    success: "Готово",
  },

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    title: "Главная",
    greeting: (name: string) => `Добро пожаловать, ${name}.`,
    uploadedThisWeek: (n: number) => `Вы загрузили ${n} кругов на этой неделе.`,
    streak: (n: number) => `Серия: ${n} дн. 🔥`,
    uploadLap: "Загрузить круг",
    nextAction: "Рекомендуемое действие",
    recentSessions: "Последние сессии",
    viewAll: "Посмотреть все",
    weeklyChallenge: "Еженедельный вызов",
    topIssues: "Последний круг — главные проблемы",
    quickActions: "Быстрые действия",
    openTelemetry: "Открыть телеметрию",
    continueAcademy: "Продолжить Академию",
    stats: {
      bestLap: "Лучший круг",
      totalLaps: "Всего кругов",
      hoursOnTrack: "Часов на трассе",
      tracksImproved: "Улучшено трасс",
    },
    challenge: {
      target: "Цель по разрыву",
      yourGap: "Ваш разрыв",
      rank: "Место",
      of: "из",
      endsOn: "Заканчивается в",
    },
    session: {
      laps: "кругов",
      improvement: "улучшение",
    },
  },

  // ─── Telemetry ─────────────────────────────────────────────────────────────
  telemetry: {
    title: "Анализ телеметрии",
    uploadLap: "Загрузить круг",
    dropZoneTitle: "Перетащите файл круга сюда",
    dropZoneSubtitle: "CSV или JSON · любой симулятор",
    browseFiles: "Выбрать файл",
    uploading: "Загрузка...",
    parsing: "Чтение данных...",
    analyzing: "Анализ круга...",
    done: "Готово",
    noLap: "Загрузите файл круга для анализа",
    noLapSub: "Поддерживаются форматы CSV и JSON с колонками: time, speed, throttle, brake, gear",
    vsMode: "Сравнение",
    referenceLap: "Референсный круг",
    personalBest: "Личный рекорд",
    channels: {
      speed: "Скорость",
      throttle: "Газ",
      brake: "Тормоз",
      delta: "Дельта",
    },
    legend: {
      yourLap: "Ваш круг",
      reference: "Референс (пунктир)",
    },
    chart: {
      title: "Все каналы · Ось X по дистанции",
      allChannels: "Все каналы",
    },
    summary: {
      yourLap: "Ваш круг",
      reference: "Референс",
      gap: "Разрыв",
    },
    errorTitle: "Ошибка парсинга",
    errorRetry: "Попробовать снова",
    sampleFormat: "Пример формата CSV",
    downloadSample: "Скачать пример",
    uploadAnother: "Загрузить другой круг",
    score: "Оценка круга",
    totalTimeLost: "Потеряно времени",
  },

  // ─── Feedback / Insights ───────────────────────────────────────────────────
  feedback: {
    title: "Анализ круга",
    totalLoss: "Итого потеряно",
    critical: "критичных",
    warnings: "предупреждений",
    info: "информация",
    noInsights: "Загрузите круг, чтобы получить анализ",
    timeCost: "Стоимость",
    perLap: "за круг",
    categories: {
      brake: "Торможение",
      throttle: "Газ",
      speed: "Скорость",
      consistency: "Стабильность",
      general: "Общее",
    },
    severity: {
      critical: "Критично",
      warning: "Внимание",
      info: "Инфо",
      good: "Хорошо",
    },
    learnModule: "Пройти урок",
    dominantWeakness: (category: string) => {
      const map: Record<string, string> = {
        brake: "Главная проблема: торможение",
        throttle: "Главная проблема: газ на выходе",
        speed: "Главная проблема: скорость в поворотах",
        consistency: "Главная проблема: непоследовательность",
        general: "Есть над чем работать",
      };
      return map[category] ?? "Есть над чем работать";
    },
    academyLink: "Связанный урок Академии",
  },

  // ─── Academy ───────────────────────────────────────────────────────────────
  academy: {
    title: "Академия",
    subtitle: "Учебный центр",
    progressLabel: (done: number, total: number) => `${done} из ${total} модулей завершено`,
    tiers: {
      all: "Все модули",
      beginner: "Начальный",
      intermediate: "Средний",
      advanced: "Продвинутый",
    },
    module: {
      lessons: "уроков",
      lessonTypes: {
        video: "видео",
        exercise: "упражнение",
        task: "задание",
      },
      graduationMetric: "Метрика выпуска",
      practicalTask: "Практическое задание",
      keyPoints: "Ключевые моменты",
      prerequisite: "Пройдите предыдущие модули, чтобы разблокировать.",
      connectedToTelemetry: "Привязано к телеметрии",
      lessonCount: (n: number) => `${n} ${n === 1 ? "урок" : n < 5 ? "урока" : "уроков"}`,
      minuteCount: (n: number) => `${n} мин`,
    },
    continueLearning: "Продолжить обучение",
    telemetryLink: "Ваша телеметрия показала проблему с этим навыком",
    fromTelemetry: "→ из телеметрии",
    selectModule: "Выберите модуль для просмотра",
  },

  // ─── Tracks ────────────────────────────────────────────────────────────────
  tracks: {
    title: "Трассы",
    subtitle: "База данных трасс",
    available: (n: number) => `${n} трасс · Референсные круги для всех комбинаций`,
    difficulty: {
      easy: "Лёгкая",
      medium: "Средняя",
      hard: "Сложная",
      expert: "Экспертная",
    },
    stats: {
      length: "Длина",
      corners: "Повороты",
      lapRecord: "Рекорд трассы",
      yourBest: "Ваш рекорд",
    },
    gapToRef: (s: string) => `Вы отстаёте от референса на ${s}`,
    characteristics: "Характеристики трассы",
    sectors: "Разбивка по секторам",
    analyzeHere: (name: string) => `Анализировать на ${name}`,
    referenceLap: "Референсный круг",
  },

  // ─── Cars ──────────────────────────────────────────────────────────────────
  cars: {
    title: "Автомобили",
    subtitle: "База данных автомобилей",
    available: (n: number) => `${n} GT3 автомобиля · Гайды по настройке`,
    stats: {
      power: "Мощность",
      weight: "Масса",
      topSpeed: "Макс. скорость",
      accel: "0–100 км/ч",
    },
    strengths: "Преимущества",
    weaknesses: "Недостатки",
    setupHints: "Советы по настройке",
    overview: "Плюсы и минусы",
    setup: "Настройка",
    trackSetup: "Настройка для трассы",
    selectTrack: "Трасса",
    conditions: {
      dry: "Сухо",
      wet: "Мокро",
      intermediate: "Переходные",
    },
    impact: {
      high: "Высокое влияние",
      medium: "Среднее влияние",
      low: "Низкое влияние",
    },
    categories: {
      suspension: "Подвеска",
      aero: "Аэродинамика",
      differential: "Дифференциал",
      brake: "Тормоза",
      tyres: "Шины",
    },
    analyzeLaps: (name: string) => `Анализировать круги на ${name}`,
  },

  // ─── Errors ────────────────────────────────────────────────────────────────
  errors: {
    parseError: "Не удалось прочитать файл",
    noTimeColumn: "Не найдена колонка 'time' в CSV",
    noSpeedColumn: "Не найдена колонка 'speed' в CSV",
    tooFewRows: "Слишком мало данных — нужно минимум 10 строк",
    invalidJSON: "Невалидный JSON файл",
    unsupportedFormat: "Неподдерживаемый формат файла. Используйте CSV или JSON.",
    fileTooLarge: "Файл слишком большой (максимум 50 МБ)",
  },

  settings: {
    title: "Настройки",
    language: "Язык",
    languageDesc: "Выберите язык интерфейса",
    english: "English",
    russian: "Русский",
    saved: "Настройки сохранены",
  },

  onboarding: {
    step1Title: "Данные не лгут",
    step1Body: "Телеметрия — это запись вашего круга: скорость, газ, тормоз и руль в каждой точке. Никаких догадок. Только то, что было.",
    step2Title: "Дельта-время: ваш главный показатель",
    step2Body: "График дельты показывает, опережаете вы или отстаёте от референса в каждой точке трассы. Красный = теряете время. Зелёный = выигрываете.",
    step3Title: "Академия замыкает круг",
    step3Body: "Когда анализ находит проблему — например, раннее торможение в повороте 3 — он сразу ссылается на урок, объясняющий как это исправить.",
    step4Title: "Система умнеет с каждым кругом",
    step4Body: "Каждый загруженный круг пополняет ваш личный профиль. Со временем тренер замечает паттерны: 'Вы всегда рано тормозите в повороте 3.'",
    skip: "Пропустить",
    next: "Далее",
    start: "Начать анализ",
  },
} as const;


export type RuKeys = typeof ru;
