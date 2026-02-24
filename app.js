(function () {
  "use strict";

  const FEEDING_SLOTS = ["08:00", "12:00", "16:00", "20:00"];
  const SLOT_WINDOW_MINUTES = 120;
  const LATE_AFTER_MINUTES = 90;
  const SLOT_ASSIGNMENT_WINDOW_MINUTES = 60;
  const STORAGE_KEY = "dog-feedings-v1";
  const TOILET_STORAGE_KEY = "dog-toilet-v1";
  const DIARY_STORAGE_KEY = "family-diary-v1";
  const STORAGE_KEY_PREFIX = "dog-feedings-v";
  const STORAGE_MIGRATION_MARKER_KEY = "dog-feedings-migrated-v1";

  const selectedDateInput = document.getElementById("selected-date");
  const todayBtn = document.getElementById("today-btn");
  const installBtn = document.getElementById("install-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const exportForm = document.getElementById("export-form");
  const exportFeedingInput = document.getElementById("export-feeding");
  const exportToiletInput = document.getElementById("export-toilet");
  const exportDiaryInput = document.getElementById("export-diary");
  const exportRangeAllBtn = document.getElementById("export-range-all");
  const exportRange7dBtn = document.getElementById("export-range-7d");
  const exportRangeMonthBtn = document.getElementById("export-range-month");
  const exportFromDateInput = document.getElementById("export-from-date");
  const exportToDateInput = document.getElementById("export-to-date");
  const storageInfo = document.getElementById("storage-info");
  const slotsRoot = document.getElementById("slots");
  const logList = document.getElementById("log-list");
  const kathiComplimentText = document.getElementById("kathi-compliment");

  const feedingForm = document.getElementById("feeding-form");
  const userPresetButtons = Array.from(document.querySelectorAll(".user-preset"));
  const amountInput = document.getElementById("amount-g");
  const fedByInput = document.getElementById("fed-by");
  const noteInput = document.getElementById("note");
  const toiletForm = document.getElementById("toilet-form");
  const toiletKindInput = document.getElementById("toilet-kind");
  const toiletPresetButtons = Array.from(document.querySelectorAll(".toilet-preset"));
  const toiletLogList = document.getElementById("toilet-log-list");
  const diaryForm = document.getElementById("diary-form");
  const diaryDateInput = document.getElementById("diary-date");
  const diaryAuthorInput = document.getElementById("diary-author");
  const diaryTextInput = document.getElementById("diary-text");
  const diaryTimeline = document.getElementById("diary-timeline");

  const config = window.APP_CONFIG || {};
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);

  const api = hasSupabase ? createSupabaseApi(config) : createLocalApi();
  storageInfo.textContent = hasSupabase ? "Speicher: Supabase (geteilt)" : "Speicher: lokal (nur dieses Gerät)";

  const state = {
    selectedDate: todayISODate(),
    entries: [],
    toiletEntries: [],
    diaryEntries: []
  };

  const KATHI_COMPLIMENTS = [
    "Kathi, du schaffst es jeden Tag, dass sich alles ein bisschen leichter anfühlt.",
    "Deine Ruhe und dein Blick für die wichtigen Dinge sind einfach besonders.",
    "Mit dir wird selbst ein chaotischer Tag zu etwas, das man gut meistern kann.",
    "Du hast eine Art, die Menschen um dich herum sofort wohler fühlen zu lassen.",
    "Dein Einsatz für die Familie ist stark, konstant und richtig beeindruckend.",
    "Du bringst Wärme in den Alltag, ohne viel Aufhebens darum zu machen.",
    "Deine Geduld und dein Herz sind eine seltene Kombination.",
    "Du machst so viele kleine Dinge richtig, die für alle einen großen Unterschied machen.",
    "Deine Verlässlichkeit ist ein riesiger Anker für alle um dich herum.",
    "Du hast einen tollen Humor, der genau dann kommt, wenn man ihn braucht.",
    "Deine Art zuzuhören ist eine echte Stärke.",
    "Du hast ein Auge für Details, die anderen oft entgehen.",
    "Du bist kreativ, pragmatisch und herzlich zugleich.",
    "Mit deiner Energie bringst du Struktur und gute Stimmung zusammen.",
    "Du gibst dem Alltag eine Qualität, die man nicht planen kann.",
    "Du bist für viele Dinge gleichzeitig da und machst das mit erstaunlicher Leichtigkeit.",
    "Dein Mitgefühl und deine Klarheit passen perfekt zusammen.",
    "Du bist stark, ohne laut sein zu müssen.",
    "Du schaffst es, dass sich Zuhause wirklich wie Zuhause anfühlt.",
    "Deine positive Art steckt an und tut allen gut.",
    "Du machst aus normalen Tagen oft richtig schöne Momente.",
    "Deine Ausdauer ist bemerkenswert und inspirierend.",
    "Du bist eine echte Teamplayerin mit einem großen Herzen.",
    "Deine Art, Dinge anzupacken, ist konzentriert und bewundernswert."
  ];

  init();

  async function init() {
    selectedDateInput.value = state.selectedDate;
    setSelectedUser("Benny");
    setSelectedToiletKind("SHIT");
    diaryDateInput.value = state.selectedDate;
    exportToDateInput.value = state.selectedDate;
    renderKathiCompliment();
    registerServiceWorker();
    setupInstallPrompt();
    attachEvents();
    await loadAllData();
  }

  function attachEvents() {
    selectedDateInput.addEventListener("change", async function () {
      state.selectedDate = selectedDateInput.value;
      diaryDateInput.value = state.selectedDate;
      await loadAllData();
    });

    todayBtn.addEventListener("click", async function () {
      state.selectedDate = todayISODate();
      selectedDateInput.value = state.selectedDate;
      diaryDateInput.value = state.selectedDate;
      await loadAllData();
    });

    userPresetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const user = button.getAttribute("data-user");
        if (user) {
          setSelectedUser(user);
        }
      });
    });

    toiletPresetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const kind = button.getAttribute("data-kind");
        if (kind) {
          setSelectedToiletKind(kind);
        }
      });
    });

    refreshBtn.addEventListener("click", loadAllData);
    exportForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      await exportCombinedCsv();
    });
    exportRangeAllBtn.addEventListener("click", function () {
      exportFromDateInput.value = "";
      exportToDateInput.value = "";
    });
    exportRange7dBtn.addEventListener("click", function () {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      exportFromDateInput.value = toIsoDate(from);
      exportToDateInput.value = toIsoDate(today);
    });
    exportRangeMonthBtn.addEventListener("click", function () {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      exportFromDateInput.value = toIsoDate(from);
      exportToDateInput.value = toIsoDate(today);
    });

    feedingForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const fedAt = new Date();
      const slotTime = slotWithinWindowHHMM(fedAt);
      if (!slotTime) {
        alert("Aktuell nicht im Slot-Fenster. Eintrag ist nur bis 1 Stunde vor oder nach 08:00, 12:00, 16:00, 20:00 möglich.");
        return;
      }

      const amountG = Number(amountInput.value);
      if (!Number.isFinite(amountG) || amountG <= 0) {
        alert("Bitte eine gültige Menge in Gramm angeben.");
        return;
      }

      const payload = {
        fed_at: fedAt.toISOString(),
        amount_g: Math.round(amountG),
        fed_by: (fedByInput.value || "").trim(),
        note: (noteInput.value || "").trim(),
        slot_time: slotTime
      };

      try {
        await api.createEntry(payload);
        feedingForm.reset();
        setSelectedUser("Benny");
        state.selectedDate = todayISODate();
        selectedDateInput.value = state.selectedDate;
        diaryDateInput.value = state.selectedDate;
        await loadAllData();
      } catch (error) {
        alert("Speichern fehlgeschlagen: " + String(error.message || error));
      }
    });

    toiletForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const kind = (toiletKindInput.value || "").trim();
      if (kind !== "SHIT" && kind !== "PISS") {
        alert("Bitte Shit oder Piss auswählen.");
        return;
      }

      try {
        await api.createToiletEntry({
          event_at: new Date().toISOString(),
          kind: kind
        });
        setSelectedToiletKind("SHIT");
        state.selectedDate = todayISODate();
        selectedDateInput.value = state.selectedDate;
        diaryDateInput.value = state.selectedDate;
        await loadAllData();
      } catch (error) {
        alert("Shit & Piss speichern fehlgeschlagen: " + String(error.message || error));
      }
    });

    diaryForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const entryDate = (diaryDateInput.value || "").trim();
      const text = (diaryTextInput.value || "").trim();
      const author = (diaryAuthorInput.value || "").trim();

      if (!entryDate) {
        alert("Bitte ein Datum wählen.");
        return;
      }
      if (!text) {
        alert("Bitte einen Tagebuchtext eingeben.");
        return;
      }

      try {
        await api.createDiaryEntry({
          entry_date: entryDate,
          text: text,
          author: author
        });
        diaryTextInput.value = "";
        diaryAuthorInput.value = "";
        await loadAllData();
      } catch (error) {
        alert("Tagebuch speichern fehlgeschlagen: " + String(error.message || error));
      }
    });
  }

  function setSelectedUser(userName) {
    fedByInput.value = userName;
    userPresetButtons.forEach(function (button) {
      const active = button.getAttribute("data-user") === userName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setSelectedToiletKind(kind) {
    toiletKindInput.value = kind;
    toiletPresetButtons.forEach(function (button) {
      const active = button.getAttribute("data-kind") === kind;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function (error) {
        console.warn("Service Worker Fehler:", error);
      });
    });
  }

  function setupInstallPrompt() {
    let deferredPrompt = null;
    const isStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;

    if (isStandalone) {
      installBtn.hidden = true;
      return;
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      installBtn.textContent = "App installieren";
    });

    installBtn.addEventListener("click", async function () {
      if (!deferredPrompt) {
        alert("Auf iPhone: Teilen > Zum Home-Bildschirm. Auf Android: Browser-Menue > Installieren.");
        return;
      }

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.hidden = true;
    });

    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      installBtn.hidden = true;
    });
  }

  async function loadAllData() {
    await Promise.all([loadEntries(), loadToiletEntries(), loadDiaryEntries()]);
  }

  async function loadEntries() {
    try {
      state.entries = await api.listEntriesByDate(state.selectedDate);
      render();
    } catch (error) {
      alert("Laden fehlgeschlagen: " + String(error.message || error));
    }
  }

  async function loadDiaryEntries() {
    try {
      state.diaryEntries = await api.listDiaryEntries();
      renderDiaryTimeline();
    } catch (error) {
      alert("Tagebuch laden fehlgeschlagen: " + String(error.message || error));
    }
  }

  async function loadToiletEntries() {
    try {
      state.toiletEntries = await api.listToiletEntriesByDate(state.selectedDate);
      renderToiletLog();
    } catch (error) {
      alert("Shit & Piss laden fehlgeschlagen: " + String(error.message || error));
    }
  }

  function render() {
    renderSlots();
    renderLog();
  }

  function renderToiletLog() {
    if (!state.toiletEntries.length) {
      toiletLogList.innerHTML = "<p>Noch keine Eintraege an diesem Tag.</p>";
      return;
    }

    const sorted = state.toiletEntries.slice().sort(function (a, b) {
      return new Date(b.event_at) - new Date(a.event_at);
    });

    toiletLogList.innerHTML = "";
    sorted.forEach(function (entry) {
      const row = document.createElement("article");
      row.className = "log-item";

      const when = new Date(entry.event_at).toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short"
      });
      const typeLabel = entry.kind === "PISS" ? "Piss" : "Shit";

      row.innerHTML =
        '<div class="log-item-main">' +
        "<strong>" + safe(typeLabel) + "</strong>" +
        "<small>" + safe(when) + "</small>" +
        "</div>";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger";
      delBtn.textContent = "Löschen";
      delBtn.addEventListener("click", async function () {
        const ok = confirm("Eintrag wirklich loeschen?");
        if (!ok) {
          return;
        }
        try {
          await api.deleteToiletEntry(entry.id);
          await loadToiletEntries();
        } catch (error) {
          alert("Löschen fehlgeschlagen: " + String(error.message || error));
        }
      });

      row.appendChild(delBtn);
      toiletLogList.appendChild(row);
    });
  }

  function renderSlots() {
    const now = new Date();
    const selectedDateStart = startOfDay(new Date(state.selectedDate + "T00:00:00"));
    const isToday = sameDate(selectedDateStart, startOfDay(now));
    const selectedIsPastOrToday = selectedDateStart.getTime() <= startOfDay(now).getTime();

    const entriesBySlot = groupLastEntryBySlot(state.entries);
    slotsRoot.innerHTML = "";

    FEEDING_SLOTS.forEach(function (slot) {
      const slotDate = dateWithHHMM(selectedDateStart, slot);
      const entry = entriesBySlot[slot] || null;
      const status = evaluateSlotStatus(slotDate, entry, isToday ? now : null);
      const canManualSet = !entry && selectedIsPastOrToday && (!isToday || slotDate.getTime() <= now.getTime());

      const card = document.createElement("article");
      card.className = "slot";
      const left = document.createElement("div");
      left.className = "slot-left";
      left.innerHTML = '<span class="lamp ' + status.kind + '"></span><strong>' + slot + "</strong>";

      const right = document.createElement("div");
      right.innerHTML = "<div>" + status.label + "</div><small>" + status.detail + "</small>";

      if (canManualSet) {
        const manualBtn = document.createElement("button");
        manualBtn.type = "button";
        manualBtn.className = "slot-manual-btn";
        manualBtn.textContent = "Manuell auf gruen";
        manualBtn.addEventListener("click", async function () {
          await manualMarkSlotAsFed(slotDate, slot);
        });
        right.appendChild(document.createElement("br"));
        right.appendChild(manualBtn);
      }

      card.appendChild(left);
      card.appendChild(right);
      slotsRoot.appendChild(card);
    });
  }

  async function manualMarkSlotAsFed(slotDate, slot) {
    const suggested = String(guessDefaultAmountG());
    const raw = prompt("Menge in Gramm für " + slot + ":", suggested);
    if (raw === null) {
      return;
    }
    const amountG = Number(raw);
    if (!Number.isFinite(amountG) || amountG <= 0) {
      alert("Bitte eine gültige Menge in Gramm angeben.");
      return;
    }

    try {
      await api.createEntry({
        fed_at: slotDate.toISOString(),
        amount_g: Math.round(amountG),
        fed_by: "Manuell",
        note: "Manuell auf gruen gesetzt",
        slot_time: slot
      });
      await loadEntries();
    } catch (error) {
      alert("Manuelles Setzen fehlgeschlagen: " + String(error.message || error));
    }
  }

  function guessDefaultAmountG() {
    const sorted = state.entries.slice().sort(function (a, b) {
      return new Date(b.fed_at) - new Date(a.fed_at);
    });
    const last = sorted.find(function (entry) {
      return Number.isFinite(Number(entry.amount_g)) && Number(entry.amount_g) > 0;
    });
    return last ? Math.round(Number(last.amount_g)) : 180;
  }

  function renderLog() {
    if (!state.entries.length) {
      logList.innerHTML = "<p>Noch keine Eintraege an diesem Tag.</p>";
      return;
    }

    logList.innerHTML = "";
    const sorted = state.entries.slice().sort(function (a, b) {
      return new Date(b.fed_at) - new Date(a.fed_at);
    });

    sorted.forEach(function (entry) {
      const row = document.createElement("article");
      row.className = "log-item";

      const fedAt = new Date(entry.fed_at);
      const dateText = fedAt.toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short"
      });

      row.innerHTML =
        '<div class="log-item-main">' +
        "<strong>" + dateText + " | " + safe(entry.amount_g) + " g</strong>" +
        "<small>Von: " + safe(entry.fed_by || "-") + "</small>" +
        "<small>Notiz: " + safe(entry.note || "-") + "</small>" +
        "</div>";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger";
      delBtn.textContent = "Löschen";
      delBtn.addEventListener("click", async function () {
        const ok = confirm("Eintrag wirklich loeschen?");
        if (!ok) {
          return;
        }
        try {
          await api.deleteEntry(entry.id);
          await loadEntries();
        } catch (error) {
          alert("Löschen fehlgeschlagen: " + String(error.message || error));
        }
      });

      row.appendChild(delBtn);
      logList.appendChild(row);
    });
  }

  function renderDiaryTimeline() {
    if (!state.diaryEntries.length) {
      diaryTimeline.innerHTML = "<p>Noch keine Tagebucheintraege vorhanden.</p>";
      return;
    }

    const sorted = state.diaryEntries.slice().sort(function (a, b) {
      const ad = String(a.entry_date || "");
      const bd = String(b.entry_date || "");
      if (ad !== bd) {
        return ad < bd ? 1 : -1;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    let html = "";
    let currentDate = "";
    sorted.forEach(function (entry) {
      if (entry.entry_date !== currentDate) {
        currentDate = entry.entry_date;
        const dateLabel = new Date(currentDate + "T00:00:00").toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
        html += '<h3 class="timeline-date">' + safe(dateLabel) + "</h3>";
      }

      const created = new Date(entry.created_at);
      const createdText = created.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      html +=
        '<article class="diary-item">' +
        '<div class="diary-meta">' + safe(createdText) + " | " + safe(entry.author || "Ohne Name") + "</div>" +
        '<div class="diary-body">' + safe(entry.text) + "</div>" +
        '<button type="button" class="danger diary-delete" data-id="' + safe(entry.id) + '">Löschen</button>' +
        "</article>";
    });

    diaryTimeline.innerHTML = html;
    Array.from(diaryTimeline.querySelectorAll(".diary-delete")).forEach(function (button) {
      button.addEventListener("click", async function () {
        const id = button.getAttribute("data-id");
        if (!id) {
          return;
        }
        const ok = confirm("Tagebucheintrag wirklich loeschen?");
        if (!ok) {
          return;
        }
        try {
          await api.deleteDiaryEntry(id);
          await loadDiaryEntries();
        } catch (error) {
          alert("Löschen fehlgeschlagen: " + String(error.message || error));
        }
      });
    });
  }

  async function exportCombinedCsv() {
    const exportFeeding = exportFeedingInput.checked;
    const exportToilet = exportToiletInput.checked;
    const exportDiary = exportDiaryInput.checked;
    if (!exportFeeding && !exportToilet && !exportDiary) {
      alert("Bitte mindestens eine Datenart auswählen.");
      return;
    }

    const fromDate = (exportFromDateInput.value || "").trim();
    const toDate = (exportToDateInput.value || "").trim();
    if (fromDate && toDate && fromDate > toDate) {
      alert("Der Von-Wert darf nicht nach dem Bis-Wert liegen.");
      return;
    }

    try {
      const rows = [];

      if (exportFeeding) {
        const feedingRows = await api.listAllEntries();
        feedingRows.forEach(function (entry) {
          const eventDate = isoToLocalDate(entry.fed_at);
          if (!withinDateRange(eventDate, fromDate, toDate)) {
            return;
          }
          rows.push([
            "feeding",
            entry.id || "",
            eventDate,
            isoToLocalTime(entry.fed_at),
            entry.fed_by || "",
            entry.amount_g || "",
            entry.slot_time || "",
            entry.note || "",
            "",
            entry.created_at || ""
          ]);
        });
      }

      if (exportToilet) {
        const toiletRows = await api.listAllToiletEntries();
        toiletRows.forEach(function (entry) {
          const eventDate = isoToLocalDate(entry.event_at);
          if (!withinDateRange(eventDate, fromDate, toDate)) {
            return;
          }
          rows.push([
            "toilet",
            entry.id || "",
            eventDate,
            isoToLocalTime(entry.event_at),
            entry.kind || "",
            "",
            "",
            "",
            "",
            entry.created_at || ""
          ]);
        });
      }

      if (exportDiary) {
        const diaryRows = await api.listAllDiaryEntries();
        diaryRows.forEach(function (entry) {
          const eventDate = entry.entry_date || "";
          if (!withinDateRange(eventDate, fromDate, toDate)) {
            return;
          }
          rows.push([
            "diary",
            entry.id || "",
            eventDate,
            isoToLocalTime(entry.created_at),
            entry.author || "",
            "",
            "",
            "",
            entry.text || "",
            entry.created_at || ""
          ]);
        });
      }

      rows.sort(function (a, b) {
        const aKey = (a[2] || "") + "T" + (a[3] || "00:00");
        const bKey = (b[2] || "") + "T" + (b[3] || "00:00");
        return aKey < bKey ? 1 : -1;
      });

      const csv = toCsv(
        ["section", "id", "event_date", "event_time", "actor_or_kind", "amount_g", "slot_time", "note", "text", "created_at"],
        rows
      );
      downloadCsv("charly-export", csv);
    } catch (error) {
      alert("Export fehlgeschlagen: " + String(error.message || error));
    }
  }

  function toCsv(headers, rows) {
    const lines = [headers.join(",")];
    rows.forEach(function (row) {
      lines.push(row.map(csvCell).join(","));
    });
    return lines.join("\n");
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function isoToLocalDate(isoString) {
    if (!isoString) {
      return "";
    }
    const dateObj = new Date(isoString);
    if (Number.isNaN(dateObj.getTime())) {
      return "";
    }
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return dateObj.getFullYear() + "-" + month + "-" + day;
  }

  function isoToLocalTime(isoString) {
    if (!isoString) {
      return "";
    }
    const dateObj = new Date(isoString);
    if (Number.isNaN(dateObj.getTime())) {
      return "";
    }
    const hour = String(dateObj.getHours()).padStart(2, "0");
    const minute = String(dateObj.getMinutes()).padStart(2, "0");
    return hour + ":" + minute;
  }

  function withinDateRange(eventDate, fromDate, toDate) {
    if (!eventDate) {
      return false;
    }
    if (fromDate && eventDate < fromDate) {
      return false;
    }
    if (toDate && eventDate > toDate) {
      return false;
    }
    return true;
  }

  function downloadCsv(section, content) {
    const stamp = todayISODate();
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = section + "-" + stamp + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function evaluateSlotStatus(slotDate, entry, nowOrNull) {
    if (entry) {
      const fedTime = new Date(entry.fed_at);
      return {
        kind: "ok",
        label: "Erledigt",
        detail: "Gefuettert um " + fedTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " (" + entry.amount_g + " g)"
      };
    }

    if (!nowOrNull) {
      return { kind: "bad", label: "Nicht gefuettert", detail: "Kein Eintrag vorhanden" };
    }

    const diffMinutes = Math.round((nowOrNull - slotDate) / 60000);
    if (diffMinutes < -SLOT_WINDOW_MINUTES / 2) {
      return { kind: "future", label: "Noch nicht fällig", detail: "Geplant für " + slotDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) };
    }
    if (diffMinutes <= LATE_AFTER_MINUTES) {
      return { kind: "warn", label: "Faellig", detail: "Bitte bald fuettern" };
    }
    return { kind: "bad", label: "Überfällig", detail: "Kein Eintrag vorhanden" };
  }

  function groupLastEntryBySlot(entries) {
    const map = {};
    entries.forEach(function (entry) {
      const slot = entry.slot_time;
      if (!slot) {
        return;
      }
      const current = map[slot];
      if (!current || new Date(entry.fed_at) > new Date(current.fed_at)) {
        map[slot] = entry;
      }
    });
    return map;
  }

  function slotWithinWindowHHMM(dateObj) {
    const totalMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    FEEDING_SLOTS.forEach(function (slot) {
      const parts = slot.split(":");
      const slotMinutes = Number(parts[0]) * 60 + Number(parts[1]);
      const dist = Math.abs(slotMinutes - totalMinutes);
      if (dist <= SLOT_ASSIGNMENT_WINDOW_MINUTES && dist < bestDistance) {
        bestDistance = dist;
        best = slot;
      }
    });
    return best;
  }

  function safe(value) {
    return String(value).replace(/[<>&"]/g, function (char) {
      if (char === "<") return "&lt;";
      if (char === ">") return "&gt;";
      if (char === "&") return "&amp;";
      return "&quot;";
    });
  }

  function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function startOfDay(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
  }

  function dateWithHHMM(baseDate, hhmm) {
    const parts = hhmm.split(":");
    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      Number(parts[0]),
      Number(parts[1]),
      0,
      0
    );
  }

  function todayISODate() {
    const d = new Date();
    return toIsoDate(d);
  }

  function toIsoDate(dateObj) {
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return dateObj.getFullYear() + "-" + month + "-" + day;
  }

  function createLocalApi() {
    function parseEntries(raw) {
      if (!raw) {
        return [];
      }
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        return [];
      }
    }

    function listLegacyStorageKeys() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) {
          continue;
        }
        if (key === STORAGE_KEY || key.indexOf(STORAGE_KEY_PREFIX) !== 0) {
          continue;
        }
        keys.push(key);
      }
      return keys;
    }

    function dedupeById(entries) {
      const map = new Map();
      entries.forEach(function (entry) {
        const id = entry && entry.id ? String(entry.id) : "";
        if (!id) {
          return;
        }
        const existing = map.get(id);
        if (!existing || new Date(entry.created_at || entry.fed_at || 0) > new Date(existing.created_at || existing.fed_at || 0)) {
          map.set(id, entry);
        }
      });
      return Array.from(map.values());
    }

    function migrateLegacyDataIfNeeded() {
      if (localStorage.getItem(STORAGE_MIGRATION_MARKER_KEY) === "1") {
        return;
      }

      const merged = parseEntries(localStorage.getItem(STORAGE_KEY));
      listLegacyStorageKeys().forEach(function (key) {
        merged.push.apply(merged, parseEntries(localStorage.getItem(key)));
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeById(merged)));
      localStorage.setItem(STORAGE_MIGRATION_MARKER_KEY, "1");
    }

    function readAll() {
      migrateLegacyDataIfNeeded();
      return dedupeById(parseEntries(localStorage.getItem(STORAGE_KEY)));
    }

    function writeAll(entries) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupeById(entries)));
    }

    function readDiaryAll() {
      const raw = localStorage.getItem(DIARY_STORAGE_KEY);
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        return [];
      }
    }

    function writeDiaryAll(entries) {
      localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
    }

    function readToiletAll() {
      const raw = localStorage.getItem(TOILET_STORAGE_KEY);
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        return [];
      }
    }

    function writeToiletAll(entries) {
      localStorage.setItem(TOILET_STORAGE_KEY, JSON.stringify(entries));
    }

    return {
      async listEntriesByDate(dateISO) {
        const all = readAll();
        const range = localDateUtcRange(dateISO);
        return all.filter(function (entry) {
          const t = new Date(entry.fed_at).getTime();
          return t >= range.fromMs && t <= range.toMs;
        });
      },
      async listAllEntries() {
        return readAll();
      },
      async createEntry(payload) {
        const all = readAll();
        all.push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
          created_at: new Date().toISOString(),
          ...payload
        });
        writeAll(all);
      },
      async deleteEntry(id) {
        const all = readAll();
        const next = all.filter(function (item) {
          return item.id !== id;
        });
        writeAll(next);
      },
      async listDiaryEntries() {
        return readDiaryAll();
      },
      async listAllDiaryEntries() {
        return readDiaryAll();
      },
      async createDiaryEntry(payload) {
        const all = readDiaryAll();
        all.push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
          created_at: new Date().toISOString(),
          ...payload
        });
        writeDiaryAll(all);
      },
      async deleteDiaryEntry(id) {
        const all = readDiaryAll();
        writeDiaryAll(all.filter(function (item) {
          return item.id !== id;
        }));
      },
      async listToiletEntriesByDate(dateISO) {
        const all = readToiletAll();
        const range = localDateUtcRange(dateISO);
        return all.filter(function (entry) {
          const t = new Date(entry.event_at).getTime();
          return t >= range.fromMs && t <= range.toMs;
        });
      },
      async listAllToiletEntries() {
        return readToiletAll();
      },
      async createToiletEntry(payload) {
        const all = readToiletAll();
        all.push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
          created_at: new Date().toISOString(),
          ...payload
        });
        writeToiletAll(all);
      },
      async deleteToiletEntry(id) {
        const all = readToiletAll();
        writeToiletAll(all.filter(function (item) {
          return item.id !== id;
        }));
      }
    };
  }

  function createSupabaseApi(cfg) {
    const root = cfg.supabaseUrl.replace(/\/+$/, "");
    const base = root + "/rest/v1/dog_feedings";
    const toiletBase = root + "/rest/v1/dog_toilet_events";
    const diaryBase = root + "/rest/v1/family_diary_entries";

    async function request(url, options) {
      const response = await fetch(url, {
        ...options,
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + cfg.supabaseAnonKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...(options && options.headers ? options.headers : {})
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error("HTTP " + response.status + ": " + text);
      }

      const noBody = response.status === 204;
      return noBody ? null : response.json();
    }

    return {
      async listEntriesByDate(dateISO) {
        const range = localDateUtcRange(dateISO);
        const from = new Date(range.fromMs).toISOString();
        const to = new Date(range.toMs).toISOString();
        const query =
          "?select=id,created_at,fed_at,amount_g,fed_by,note,slot_time" +
          "&fed_at=gte." + encodeURIComponent(from) +
          "&fed_at=lte." + encodeURIComponent(to) +
          "&order=fed_at.asc";
        const data = await request(base + query, { method: "GET" });
        return Array.isArray(data) ? data : [];
      },
      async listAllEntries() {
        const query =
          "?select=id,created_at,fed_at,amount_g,fed_by,note,slot_time" +
          "&order=fed_at.desc" +
          "&limit=5000";
        const data = await request(base + query, { method: "GET" });
        return Array.isArray(data) ? data : [];
      },
      async createEntry(payload) {
        await request(base, {
          method: "POST",
          body: JSON.stringify([payload])
        });
      },
      async deleteEntry(id) {
        const query = "?id=eq." + encodeURIComponent(id);
        await request(base + query, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
      },
      async listDiaryEntries() {
        const query =
          "?select=id,created_at,entry_date,author,text" +
          "&order=entry_date.desc" +
          "&order=created_at.desc" +
          "&limit=300";
        const data = await request(diaryBase + query, { method: "GET" });
        return Array.isArray(data) ? data : [];
      },
      async listAllDiaryEntries() {
        const query =
          "?select=id,created_at,entry_date,author,text" +
          "&order=entry_date.desc" +
          "&order=created_at.desc" +
          "&limit=5000";
        const data = await request(diaryBase + query, { method: "GET" });
        return Array.isArray(data) ? data : [];
      },
      async createDiaryEntry(payload) {
        await request(diaryBase, {
          method: "POST",
          body: JSON.stringify([payload])
        });
      },
      async deleteDiaryEntry(id) {
        const query = "?id=eq." + encodeURIComponent(id);
        await request(diaryBase + query, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
      },
      async listToiletEntriesByDate(dateISO) {
        const range = localDateUtcRange(dateISO);
        const from = new Date(range.fromMs).toISOString();
        const to = new Date(range.toMs).toISOString();
        const query =
          "?select=id,created_at,event_at,kind" +
          "&event_at=gte." + encodeURIComponent(from) +
          "&event_at=lte." + encodeURIComponent(to) +
          "&order=event_at.desc";
        const data = await request(toiletBase + query, { method: "GET" });
        return Array.isArray(data) ? data : [];
      },
      async listAllToiletEntries() {
        const query =
          "?select=id,created_at,event_at,kind" +
          "&order=event_at.desc" +
          "&limit=5000";
        const data = await request(toiletBase + query, { method: "GET" });
        return Array.isArray(data) ? data : [];
      },
      async createToiletEntry(payload) {
        await request(toiletBase, {
          method: "POST",
          body: JSON.stringify([payload])
        });
      },
      async deleteToiletEntry(id) {
        const query = "?id=eq." + encodeURIComponent(id);
        await request(toiletBase + query, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
      }
    };
  }

  function localDateUtcRange(dateISO) {
    const localStart = new Date(dateISO + "T00:00:00");
    const localEnd = new Date(dateISO + "T23:59:59.999");
    return {
      fromMs: localStart.getTime(),
      toMs: localEnd.getTime()
    };
  }

  function renderKathiCompliment() {
    if (!kathiComplimentText) {
      return;
    }
    const today = new Date();
    const dayNumber = Math.floor(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000
    );
    const compliment = pickDailyCompliment(dayNumber);
    kathiComplimentText.textContent = compliment;
  }

  function pickDailyCompliment(dayNumber) {
    const total = KATHI_COMPLIMENTS.length;
    if (total === 0) {
      return "Kathi, du bist großartig.";
    }
    const step = 7;
    const offset = 3;
    const index = ((dayNumber * step + offset) % total + total) % total;
    return KATHI_COMPLIMENTS[index];
  }
})();
