// Lightweight i18n for the Faceit overlay. The app uses vue-i18n with JSON
// catalogs, but the overlay only needs a handful of strings, so we keep a tiny
// reactive dictionary here (no extra dependency, and it lives happily inside the
// Shadow DOM). Locale codes mirror the app's `LocaleCode` union; the choice is
// persisted in `chrome.storage.local` and defaults to the browser language.
import { reactive } from 'vue'

export type LocaleCode = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'pl' | 'ru' | 'tr' | 'uk'

/** Selectable languages, labelled in their own tongue (shown in Settings). */
export const LOCALES: { code: LocaleCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
]

type Dict = Record<string, unknown>

const messages: Record<LocaleCode, Dict> = {
  en: {
    tabs: { match: 'Demo page', library: 'Library', settings: 'Settings' },
    header: { downloading: '{n} downloading', minimize: 'Minimize' },
    hero: {
      cta: 'Download 2D replay of the match',
      watch: 'Watch 2D replay',
      openRoom: 'Open a match room to download its demo.',
      ready: 'Ready in library',
      cancel: 'Cancel',
      error: 'Failed. Try again',
    },
    status: {
      queued: 'Queued',
      downloading: 'Downloading',
      decompressing: 'Decompressing…',
      parsing: 'Parsing…',
      building: 'Building replay…',
      storing: 'Saving…',
    },
    library: { empty: 'No replays saved yet.', remove: 'Remove', ready: 'Ready', deleteConfirm: 'Remove this replay from your library?', openRoom: 'Open on Faceit', search: 'Search', allMaps: 'All maps', import: 'Import', export: 'Export', more: 'More', noResults: 'No matches.', allSources: 'All sources', imported: 'Imported', loadMore: 'Load more ({n})' },
    settings: { language: 'Language', about: 'Parsed locally · 100% offline', openApp: 'Open the web app' },
  },
  pt: {
    tabs: { match: 'Página da demo', library: 'Biblioteca', settings: 'Ajustes' },
    header: { downloading: '{n} baixando', minimize: 'Minimizar' },
    hero: {
      cta: 'Baixar replay 2D da partida',
      watch: 'Assistir replay 2D',
      openRoom: 'Abra a sala de uma partida para baixar a demo.',
      ready: 'Pronto na biblioteca',
      cancel: 'Cancelar',
      error: 'Falhou. Tentar de novo',
    },
    status: {
      queued: 'Na fila',
      downloading: 'Baixando',
      decompressing: 'Descomprimindo…',
      parsing: 'Analisando…',
      building: 'Montando replay…',
      storing: 'Salvando…',
    },
    library: { empty: 'Nenhum replay salvo ainda.', remove: 'Remover', ready: 'Pronto', deleteConfirm: 'Remover este replay da biblioteca?', openRoom: 'Abrir no Faceit', search: 'Buscar', allMaps: 'Todos os mapas', import: 'Importar', export: 'Exportar', more: 'Mais', noResults: 'Nada encontrado.', allSources: 'Todas as fontes', imported: 'Importado', loadMore: 'Carregar mais ({n})' },
    settings: { language: 'Idioma', about: 'Processado localmente · 100% offline', openApp: 'Abrir o app web' },
  },
  es: {
    tabs: { match: 'Página de demo', library: 'Biblioteca', settings: 'Ajustes' },
    header: { downloading: '{n} descargando', minimize: 'Minimizar' },
    hero: {
      cta: 'Descargar replay 2D de la partida',
      watch: 'Ver replay 2D',
      openRoom: 'Abre la sala de una partida para descargar la demo.',
      ready: 'Listo en la biblioteca',
      cancel: 'Cancelar',
      error: 'Falló. Reintentar',
    },
    status: {
      queued: 'En cola',
      downloading: 'Descargando',
      decompressing: 'Descomprimiendo…',
      parsing: 'Analizando…',
      building: 'Creando replay…',
      storing: 'Guardando…',
    },
    library: { empty: 'Aún no hay replays guardados.', remove: 'Quitar', ready: 'Listo', deleteConfirm: '¿Quitar este replay de la biblioteca?', openRoom: 'Abrir en Faceit', search: 'Buscar', allMaps: 'Todos los mapas', import: 'Importar', export: 'Exportar', more: 'Más', noResults: 'Sin resultados.', allSources: 'Todas las fuentes', imported: 'Importado', loadMore: 'Cargar más ({n})' },
    settings: { language: 'Idioma', about: 'Procesado localmente · 100% sin conexión', openApp: 'Abrir la app web' },
  },
  fr: {
    tabs: { match: 'Page de demo', library: 'Bibliothèque', settings: 'Réglages' },
    header: { downloading: '{n} en cours', minimize: 'Réduire' },
    hero: {
      cta: 'Télécharger le replay 2D du match',
      watch: 'Voir le replay 2D',
      openRoom: 'Ouvrez le salon d’un match pour télécharger sa demo.',
      ready: 'Prêt dans la bibliothèque',
      cancel: 'Annuler',
      error: 'Échec. Réessayer',
    },
    status: {
      queued: 'En file',
      downloading: 'Téléchargement',
      decompressing: 'Décompression…',
      parsing: 'Analyse…',
      building: 'Création du replay…',
      storing: 'Enregistrement…',
    },
    library: { empty: 'Aucun replay enregistré.', remove: 'Supprimer', ready: 'Prêt', deleteConfirm: 'Supprimer ce replay de la bibliothèque ?', openRoom: 'Ouvrir sur Faceit', search: 'Rechercher', allMaps: 'Toutes les cartes', import: 'Importer', export: 'Exporter', more: 'Plus', noResults: 'Aucun résultat.', allSources: 'Toutes les sources', imported: 'Importé', loadMore: 'Charger plus ({n})' },
    settings: { language: 'Langue', about: 'Traité localement · 100% hors ligne', openApp: 'Ouvrir l’app web' },
  },
  de: {
    tabs: { match: 'Demo-Seite', library: 'Bibliothek', settings: 'Einstellungen' },
    header: { downloading: '{n} werden geladen', minimize: 'Minimieren' },
    hero: {
      cta: '2D-Replay des Matches herunterladen',
      watch: '2D-Replay ansehen',
      openRoom: 'Öffne einen Match-Raum, um die Demo herunterzuladen.',
      ready: 'Fertig in der Bibliothek',
      cancel: 'Abbrechen',
      error: 'Fehlgeschlagen. Erneut versuchen',
    },
    status: {
      queued: 'In Warteschlange',
      downloading: 'Lädt herunter',
      decompressing: 'Entpacken…',
      parsing: 'Analysieren…',
      building: 'Replay wird erstellt…',
      storing: 'Speichern…',
    },
    library: { empty: 'Noch keine Replays gespeichert.', remove: 'Entfernen', ready: 'Fertig', deleteConfirm: 'Dieses Replay aus der Bibliothek entfernen?', openRoom: 'Auf Faceit öffnen', search: 'Suchen', allMaps: 'Alle Maps', import: 'Importieren', export: 'Exportieren', more: 'Mehr', noResults: 'Keine Treffer.', allSources: 'Alle Quellen', imported: 'Importiert', loadMore: 'Mehr laden ({n})' },
    settings: { language: 'Sprache', about: 'Lokal verarbeitet · 100% offline', openApp: 'Web-App öffnen' },
  },
  pl: {
    tabs: { match: 'Strona demo', library: 'Biblioteka', settings: 'Ustawienia' },
    header: { downloading: '{n} pobiera', minimize: 'Zminimalizuj' },
    hero: {
      cta: 'Pobierz powtórkę 2D meczu',
      watch: 'Obejrzyj powtórkę 2D',
      openRoom: 'Otwórz pokój meczu, aby pobrać demo.',
      ready: 'Gotowe w bibliotece',
      cancel: 'Anuluj',
      error: 'Błąd. Spróbuj ponownie',
    },
    status: {
      queued: 'W kolejce',
      downloading: 'Pobieranie',
      decompressing: 'Dekompresja…',
      parsing: 'Analiza…',
      building: 'Tworzenie powtórki…',
      storing: 'Zapisywanie…',
    },
    library: { empty: 'Brak zapisanych powtórek.', remove: 'Usuń', ready: 'Gotowe', deleteConfirm: 'Usunąć tę powtórkę z biblioteki?', openRoom: 'Otwórz na Faceit', search: 'Szukaj', allMaps: 'Wszystkie mapy', import: 'Importuj', export: 'Eksportuj', more: 'Więcej', noResults: 'Brak wyników.', allSources: 'Wszystkie źródła', imported: 'Zaimportowano', loadMore: 'Załaduj więcej ({n})' },
    settings: { language: 'Język', about: 'Przetwarzane lokalnie · 100% offline', openApp: 'Otwórz aplikację web' },
  },
  ru: {
    tabs: { match: 'Страница демо', library: 'Библиотека', settings: 'Настройки' },
    header: { downloading: '{n} загружается', minimize: 'Свернуть' },
    hero: {
      cta: 'Скачать 2D-повтор матча',
      watch: 'Смотреть 2D-повтор',
      openRoom: 'Откройте комнату матча, чтобы скачать демо.',
      ready: 'Готово в библиотеке',
      cancel: 'Отмена',
      error: 'Ошибка. Повторить',
    },
    status: {
      queued: 'В очереди',
      downloading: 'Загрузка',
      decompressing: 'Распаковка…',
      parsing: 'Разбор…',
      building: 'Сборка повтора…',
      storing: 'Сохранение…',
    },
    library: { empty: 'Пока нет сохранённых повторов.', remove: 'Удалить', ready: 'Готово', deleteConfirm: 'Удалить этот повтор из библиотеки?', openRoom: 'Открыть на Faceit', search: 'Поиск', allMaps: 'Все карты', import: 'Импорт', export: 'Экспорт', more: 'Ещё', noResults: 'Ничего не найдено.', allSources: 'Все источники', imported: 'Импортировано', loadMore: 'Показать ещё ({n})' },
    settings: { language: 'Язык', about: 'Обрабатывается локально · 100% офлайн', openApp: 'Открыть веб-приложение' },
  },
  tr: {
    tabs: { match: 'Demo sayfası', library: 'Kütüphane', settings: 'Ayarlar' },
    header: { downloading: '{n} indiriliyor', minimize: 'Küçült' },
    hero: {
      cta: 'Maçın 2D tekrarını indir',
      watch: '2D tekrarı izle',
      openRoom: 'Demoyu indirmek için bir maç odası açın.',
      ready: 'Kütüphanede hazır',
      cancel: 'İptal',
      error: 'Başarısız. Tekrar dene',
    },
    status: {
      queued: 'Sırada',
      downloading: 'İndiriliyor',
      decompressing: 'Açılıyor…',
      parsing: 'Ayrıştırılıyor…',
      building: 'Tekrar oluşturuluyor…',
      storing: 'Kaydediliyor…',
    },
    library: { empty: 'Henüz kayıtlı tekrar yok.', remove: 'Kaldır', ready: 'Hazır', deleteConfirm: 'Bu tekrar kütüphaneden kaldırılsın mı?', openRoom: 'Faceit’te aç', search: 'Ara', allMaps: 'Tüm haritalar', import: 'İçe aktar', export: 'Dışa aktar', more: 'Daha fazla', noResults: 'Sonuç yok.', allSources: 'Tüm kaynaklar', imported: 'İçe aktarılmış', loadMore: 'Daha fazla yükle ({n})' },
    settings: { language: 'Dil', about: 'Yerel olarak işlenir · %100 çevrimdışı', openApp: 'Web uygulamasını aç' },
  },
  uk: {
    tabs: { match: 'Сторінка демо', library: 'Бібліотека', settings: 'Налаштування' },
    header: { downloading: '{n} завантажується', minimize: 'Згорнути' },
    hero: {
      cta: 'Завантажити 2D-повтор матчу',
      watch: 'Дивитись 2D-повтор',
      openRoom: 'Відкрийте кімнату матчу, щоб завантажити демо.',
      ready: 'Готово в бібліотеці',
      cancel: 'Скасувати',
      error: 'Помилка. Повторити',
    },
    status: {
      queued: 'У черзі',
      downloading: 'Завантаження',
      decompressing: 'Розпакування…',
      parsing: 'Аналіз…',
      building: 'Створення повтору…',
      storing: 'Збереження…',
    },
    library: { empty: 'Поки немає збережених повторів.', remove: 'Видалити', ready: 'Готово', deleteConfirm: 'Видалити цей повтор з бібліотеки?', openRoom: 'Відкрити на Faceit', search: 'Пошук', allMaps: 'Усі карти', import: 'Імпорт', export: 'Експорт', more: 'Ще', noResults: 'Нічого не знайдено.', allSources: 'Усі джерела', imported: 'Імпортовано', loadMore: 'Показати ще ({n})' },
    settings: { language: 'Мова', about: 'Обробляється локально · 100% офлайн', openApp: 'Відкрити вебдодаток' },
  },
}

const STORAGE_KEY = 'overlayLocale'
const state = reactive({ locale: 'en' as LocaleCode })

function detectDefault(): LocaleCode {
  const tag = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return (LOCALES.find((l) => l.code === tag)?.code as LocaleCode) ?? 'en'
}

/** Resolves the stored choice (or browser default) into the reactive locale. */
export async function initLocale(): Promise<void> {
  try {
    const { [STORAGE_KEY]: saved } = await chrome.storage.local.get(STORAGE_KEY)
    state.locale = saved && saved in messages ? (saved as LocaleCode) : detectDefault()
  } catch {
    state.locale = detectDefault()
  }
}

export function setLocale(code: LocaleCode): void {
  state.locale = code
  void chrome.storage.local.set({ [STORAGE_KEY]: code })
}

/** The currently active locale (reactive). */
export function currentLocale(): LocaleCode {
  return state.locale
}

function resolve(dict: Dict, key: string): string | undefined {
  const val = key.split('.').reduce<unknown>((o, k) => (o as Dict | undefined)?.[k], dict)
  return typeof val === 'string' ? val : undefined
}

/** Translate `key` (dotted path), falling back to English then the key itself.
 *  Reads `state.locale`, so callers in templates re-render on language change. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = resolve(messages[state.locale], key) ?? resolve(messages.en, key) ?? key
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v))
  return s
}
