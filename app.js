(function () {
  "use strict";

  const FEEDING_SLOTS = ["08:00", "12:00", "16:00", "20:00"];
  const SLOT_WINDOW_MINUTES = 120;
  const LATE_AFTER_MINUTES = 90;
  const STORAGE_KEY = "dog-feedings-v1";
  const STORAGE_KEY_PREFIX = "dog-feedings-v";
  const STORAGE_MIGRATION_MARKER_KEY = "dog-feedings-migrated-v1";

  const selectedDateInput = document.getElementById("selected-date");
  const todayBtn = document.getElementById("today-btn");
  const installBtn = document.getElementById("install-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const storageInfo = document.getElementById("storage-info");
  const slotsRoot = document.getElementById("slots");
  const logList = document.getElementById("log-list");

  const feedingForm = document.getElementById("feeding-form");
  const fedDateInput = document.getElementById("fed-date");
  const fedTimeInput = document.getElementById("fed-time");
  const slotPresetButtons = Array.from(document.querySelectorAll(".slot-preset"));
  const userPresetButtons = Array.from(document.querySelectorAll(".user-preset"));
  const amountInput = document.getElementById("amount-g");
  const fedByInput = document.getElementById("fed-by");
  const noteInput = document.getElementById("note");

  const config = window.APP_CONFIG || {};
  const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);

  const api = hasSupabase ? createSupabaseApi(config) : createLocalApi();
  storageInfo.textContent = hasSupabase ? "Speicher: Supabase (geteilt)" : "Speicher: lokal (nur dieses Geraet)";

  const state = {
    selectedDate: todayISODate(),
    entries: []
  };

  init();

  async function init() {
    selectedDateInput.value = state.selectedDate;
    fedDateInput.value = state.selectedDate;
    fedTimeInput.value = defaultTimeLocal();
    setSelectedUser("Benny");
    registerServiceWorker();
    setupInstallPrompt();
    attachEvents();
    await loadEntries();
  }

  function attachEvents() {
    selectedDateInput.addEventListener("change", async function () {
      state.selectedDate = selectedDateInput.value;
      fedDateInput.value = state.selectedDate;
      await loadEntries();
    });

    todayBtn.addEventListener("click", async function () {
      state.selectedDate = todayISODate();
      selectedDateInput.value = state.selectedDate;
      fedDateInput.value = state.selectedDate;
      fedTimeInput.value = defaultTimeLocal();
      await loadEntries();
    });

    slotPresetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const time = button.getAttribute("data-time");
        if (time) {
          fedTimeInput.value = time;
        }
      });
    });

    userPresetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const user = button.getAttribute("data-user");
        if (user) {
          setSelectedUser(user);
        }
      });
    });

    refreshBtn.addEventListener("click", loadEntries);

    feedingForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const datePart = (fedDateInput.value || "").trim();
      const timePart = (fedTimeInput.value || "").trim();
      if (!datePart || !timePart) {
        alert("Bitte Datum und Uhrzeit angeben.");
        return;
      }

      const fedAt = new Date(datePart + "T" + timePart + ":00");
      if (Number.isNaN(fedAt.getTime())) {
        alert("Ungueltige Zeit.");
        return;
      }

      const amountG = Number(amountInput.value);
      if (!Number.isFinite(amountG) || amountG <= 0) {
        alert("Bitte eine gueltige Menge in Gramm angeben.");
        return;
      }

      const payload = {
        fed_at: fedAt.toISOString(),
        amount_g: Math.round(amountG),
        fed_by: (fedByInput.value || "").trim(),
        note: (noteInput.value || "").trim(),
        slot_time: nearestSlotHHMM(fedAt)
      };

      try {
        await api.createEntry(payload);
        feedingForm.reset();
        fedDateInput.value = state.selectedDate;
        fedTimeInput.value = defaultTimeLocal();
        setSelectedUser("Benny");
        await loadEntries();
      } catch (error) {
        alert("Speichern fehlgeschlagen: " + String(error.message || error));
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

  async function loadEntries() {
    try {
      state.entries = await api.listEntriesByDate(state.selectedDate);
      render();
    } catch (error) {
      alert("Laden fehlgeschlagen: " + String(error.message || error));
    }
  }

  function render() {
    renderSlots();
    renderLog();
  }

  function renderSlots() {
    const now = new Date();
    const selectedDateStart = startOfDay(new Date(state.selectedDate + "T00:00:00"));
    const isToday = sameDate(selectedDateStart, startOfDay(now));

    const entriesBySlot = groupLastEntryBySlot(state.entries);
    slotsRoot.innerHTML = "";

    FEEDING_SLOTS.forEach(function (slot) {
      const slotDate = dateWithHHMM(selectedDateStart, slot);
      const entry = entriesBySlot[slot] || null;
      const status = evaluateSlotStatus(slotDate, entry, isToday ? now : null);

      const card = document.createElement("article");
      card.className = "slot";
      card.innerHTML =
        '<div class="slot-left">' +
        '<span class="lamp ' + status.kind + '"></span>' +
        '<strong>' + slot + "</strong>" +
        "</div>" +
        "<div>" +
        "<div>" + status.label + "</div>" +
        "<small>" + status.detail + "</small>" +
        "</div>";
      slotsRoot.appendChild(card);
    });
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
        "<small>Slot: " + safe(entry.slot_time || "-") + " | Von: " + safe(entry.fed_by || "-") + "</small>" +
        "<small>Notiz: " + safe(entry.note || "-") + "</small>" +
        "</div>";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger";
      delBtn.textContent = "Loeschen";
      delBtn.addEventListener("click", async function () {
        const ok = confirm("Eintrag wirklich loeschen?");
        if (!ok) {
          return;
        }
        try {
          await api.deleteEntry(entry.id);
          await loadEntries();
        } catch (error) {
          alert("Loeschen fehlgeschlagen: " + String(error.message || error));
        }
      });

      row.appendChild(delBtn);
      logList.appendChild(row);
    });
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
      return { kind: "future", label: "Noch nicht faellig", detail: "Geplant fuer " + slotDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) };
    }
    if (diffMinutes <= LATE_AFTER_MINUTES) {
      return { kind: "warn", label: "Faellig", detail: "Bitte bald fuettern" };
    }
    return { kind: "bad", label: "Ueberfaellig", detail: "Kein Eintrag vorhanden" };
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

  function nearestSlotHHMM(dateObj) {
    const totalMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();
    let best = FEEDING_SLOTS[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    FEEDING_SLOTS.forEach(function (slot) {
      const parts = slot.split(":");
      const slotMinutes = Number(parts[0]) * 60 + Number(parts[1]);
      const dist = Math.abs(slotMinutes - totalMinutes);
      if (dist < bestDistance) {
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
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + month + "-" + day;
  }

  function defaultTimeLocal() {
    const d = new Date();
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");
    return hour + ":" + minute;
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

    return {
      async listEntriesByDate(dateISO) {
        const all = readAll();
        const range = localDateUtcRange(dateISO);
        return all.filter(function (entry) {
          const t = new Date(entry.fed_at).getTime();
          return t >= range.fromMs && t <= range.toMs;
        });
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
      }
    };
  }

  function createSupabaseApi(cfg) {
    const base = cfg.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/dog_feedings";

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
})();
