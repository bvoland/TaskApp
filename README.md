# Todo Family App - Hundefuetterung

Erste Funktion: Oeffentliche Web-App (ohne Login) fuer die Familie, um Hundefuetterungen zu sehen und einzutragen.

## Funktionen

- Ampelanzeige je Slot: `08:00`, `12:00`, `16:00`, `20:00`
- Eintrag von:
  - Zeitpunkt der Fuetterung
  - Menge in Gramm
  - Name (optional)
  - Notiz (optional)
- Log pro Tag mit Loeschfunktion
- Shared Storage ueber Supabase (empfohlen) oder lokaler Fallback
- Responsive Layout fuer Smartphone, Tablet und Desktop
- Als mobile App installierbar (PWA: Android + iOS Home-Bildschirm)
- Verlaufsdaten bleiben bei neuen App-Versionen erhalten (keine automatische Ueberschreibung)

## Lokal starten

`index.html` direkt im Browser oeffnen reicht.

## Supabase einrichten (geteilt, ohne Login)

1. Supabase Projekt erstellen.
2. In SQL Editor den Inhalt aus `supabase.sql` ausfuehren.
3. In Supabase unter `Project Settings -> API`:
   - `Project URL` kopieren
   - `anon public` Key kopieren
4. Diese Werte in `config.js` eintragen:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY"
};
```

Hinweis: `anon` Key ist fuer Client-Apps gedacht. Fuer dieses Familien-Tool ist das passend, aber die Daten sind bewusst ohne Login offen beschreibbar.
Hinweis: Mit Supabase bleibt das Log bei neuen Versionen und auf allen Geraeten dauerhaft verfuegbar.

## Auf GitHub Pages veroeffentlichen

1. Repo auf GitHub pushen.
2. In GitHub: `Settings -> Pages`
3. `Deploy from a branch` waehlen.
4. Branch `main` und Ordner `/ (root)` waehlen.
5. Nach dem Deploy ist die URL oeffentlich und auf allen Familiengeraeten nutzbar.

## Als mobile App speichern (PWA)

- Android (Chrome/Edge):
  - Seite oeffnen
  - Browser-Menue -> `Installieren` oder `Zum Startbildschirm hinzufuegen`
- iPhone/iPad (Safari):
  - Seite oeffnen
  - `Teilen` -> `Zum Home-Bildschirm`

Hinweis: Durch `manifest.webmanifest` + `sw.js` laeuft die App als installierbare Web-App im Vollbildmodus.

## Dateien

- `index.html`: Layout
- `styles.css`: UI
- `app.js`: Ampellogik + API
- `config.js`: Supabase-Konfiguration
- `supabase.sql`: Datenbank + Policies
- `manifest.webmanifest`: PWA-Konfiguration
- `sw.js`: Offline-Cache/Service Worker
- `icons/*`: App-Icons
