/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, stay-review questions use this property from the hotel-review SQLite API. */
  readonly VITE_HOTEL_REVIEW_PROPERTY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
