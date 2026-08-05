(function () {
  "use strict";

  const registryPath = "../assets/data/badges-public.json";
  const statusClasses = {
    active: "badge-status-active",
    corrected: "badge-status-corrected",
    revoked: "badge-status-revoked",
    retired: "badge-status-retired"
  };

  const form = document.getElementById("badge-verification-form");
  const input = document.getElementById("badge-id-input");
  const message = document.getElementById("badge-status-message");
  const record = document.getElementById("badge-record");
  const tableBody = document.getElementById("badge-registry-table-body");
  const tableCount = document.getElementById("badge-table-count");
  const tableEmpty = document.getElementById("badge-table-empty");
  const showAllButton = document.getElementById("badge-show-all");
  const clearFiltersButton = document.getElementById("badge-clear-filters");
  const eventFilter = document.getElementById("badge-event-filter");
  const yearFilter = document.getElementById("badge-year-filter");
  const categoryFilter = document.getElementById("badge-category-filter");
  const companyFilter = document.getElementById("badge-company-filter");

  let badgeRecords = [];
  let activeHighlightId = "";

  function normalizeBadgeId(value) {
    return (value || "").trim().toUpperCase();
  }

  function extractBadgeId(value) {
    const match = (value || "").toUpperCase().match(/PACIO-BDG-\d{4}-\d{4}/);
    return match ? match[0] : "";
  }

  function setMessage(text, kind) {
    message.textContent = text || "";
    message.className = "badge-status-message";
    if (kind) {
      message.classList.add("badge-status-message-" + kind);
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value || "Not provided";
    }
  }

  function setBadgeLink(id, badgeId) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    element.textContent = "";
    if (!badgeId) {
      element.textContent = "Not provided";
      return;
    }
    const link = document.createElement("a");
    link.href = makeLocalVerificationHref(badgeId);
    link.textContent = badgeId;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      input.value = badgeId;
      verifyBadgeId(badgeId, true);
    });
    element.appendChild(link);
  }

  function displayValue(value) {
    return (value || "").toString().trim() || "Not provided";
  }

  function companyName(item) {
    return displayValue(item.companyName || item.recipientDisplayName);
  }

  function eventLabel(item) {
    const eventName = displayValue(item.eventName);
    const eventDate = displayValue(item.eventDateRange || item.eventMonthYear);
    return eventDate === "Not provided" ? eventName : eventName + " - " + eventDate;
  }

  function recordYear(item) {
    const eventId = item.eventId || "";
    const eventIdMatch = eventId.match(/^(20\d{2})-/);
    if (eventIdMatch) {
      return eventIdMatch[1];
    }
    const text = [item.eventDateRange, item.eventMonthYear, item.lastUpdated, item.badgeId].join(" ");
    const match = text.match(/\b(20\d{2})\b/);
    return match ? match[1] : "";
  }

  function selectedFilterValue(element) {
    return element ? normalizeBadgeId(element.value) : "";
  }

  function selectedTextFilterValue(element) {
    return element ? (element.value || "").trim().toLowerCase() : "";
  }

  function resetRecord() {
    record.hidden = true;
  }

  function makeLocalVerificationHref(badgeId) {
    return "../verification/?id=" + encodeURIComponent(badgeId);
  }

  function statusClass(status) {
    return statusClasses[(status || "").toLowerCase()] || "badge-status-neutral";
  }

  function displayRecord(item) {
    const status = item.status || "Active";
    const statusPill = document.getElementById("badge-record-status");

    document.getElementById("badge-record-title").textContent = item.recipientDisplayName || item.badgeId;
    statusPill.textContent = status;
    statusPill.className = "badge-status-pill " + statusClass(status);

    setText("record-badge-id", item.badgeId);
    setText("record-event-id", item.eventId);
    setText("record-recipient", item.recipientDisplayName);
    setText("record-company", item.companyName || item.recipientDisplayName);
    setText("record-recipient-type", item.recipientType);
    setText("record-category", item.badgeCategory);
    setText("record-event", item.eventName);
    setText("record-event-date", item.eventDateRange || item.eventMonthYear);
    setText("record-key-contributors", item.keyContributors);
    setBadgeLink("record-supersedes", item.supersedesBadgeId);
    setBadgeLink("record-superseded-by", item.supersededByBadgeId);
    setText("record-updated", item.lastUpdated);

    const note = document.getElementById("record-note");
    note.textContent = item.publicNote || "";
    note.hidden = !item.publicNote;

    record.hidden = false;
  }

  function addTableCell(row, text) {
    const cell = document.createElement("td");
    cell.textContent = displayValue(text);
    row.appendChild(cell);
    return cell;
  }

  function addBadgeIdCell(row, item) {
    const cell = document.createElement("td");
    const link = document.createElement("a");
    link.href = makeLocalVerificationHref(item.badgeId);
    link.textContent = displayValue(item.badgeId);
    link.addEventListener("click", function (event) {
      event.preventDefault();
      input.value = item.badgeId;
      verifyBadgeId(item.badgeId, true);
    });
    cell.appendChild(link);
    row.appendChild(cell);
  }

  function renderRegistryTable(filterValue, highlightValue) {
    const filter = extractBadgeId(filterValue) || normalizeBadgeId(filterValue);
    const highlight = normalizeBadgeId(highlightValue);
    const selectedEvent = selectedFilterValue(eventFilter);
    const selectedYear = selectedFilterValue(yearFilter);
    const selectedCategory = selectedFilterValue(categoryFilter);
    const selectedCompany = selectedTextFilterValue(companyFilter);
    const rows = badgeRecords.filter(function (item) {
      const badgeId = normalizeBadgeId(item.badgeId);
      const itemEvent = normalizeBadgeId(item.eventId);
      const itemCategory = normalizeBadgeId(item.badgeCategory);
      const itemYear = normalizeBadgeId(recordYear(item));
      const itemCompany = companyName(item).toLowerCase();
      return (!filter || badgeId.indexOf(filter) !== -1) &&
        (!selectedEvent || itemEvent === selectedEvent) &&
        (!selectedYear || itemYear === selectedYear) &&
        (!selectedCategory || itemCategory === selectedCategory) &&
        (!selectedCompany || itemCompany.indexOf(selectedCompany) !== -1);
    });

    tableBody.textContent = "";
    rows.forEach(function (item) {
      const row = document.createElement("tr");
      if (highlight && normalizeBadgeId(item.badgeId) === highlight) {
        row.className = "badge-row-highlight";
        row.setAttribute("aria-current", "true");
      }
      addBadgeIdCell(row, item);
      addTableCell(row, item.eventName);
      addTableCell(row, item.eventDateRange || item.eventMonthYear);
      addTableCell(row, item.badgeCategory);
      addTableCell(row, companyName(item));
      addTableCell(row, item.keyContributors);
      addTableCell(row, item.status);
      tableBody.appendChild(row);
    });

    tableEmpty.hidden = rows.length !== 0;
    tableCount.textContent = rows.length + " public badge record" + (rows.length === 1 ? "" : "s");
  }

  function optionElement(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function replaceOptions(select, firstLabel, options) {
    select.textContent = "";
    select.appendChild(optionElement("", firstLabel));
    options.forEach(function (item) {
      select.appendChild(optionElement(item.value, item.label));
    });
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort();
  }

  function populateFilters() {
    const eventsById = {};
    badgeRecords.forEach(function (item) {
      if (item.eventId && !eventsById[item.eventId]) {
        eventsById[item.eventId] = eventLabel(item);
      }
    });
    const eventOptions = Object.keys(eventsById).sort().map(function (eventId) {
      return { value: eventId, label: eventsById[eventId] };
    });
    const yearOptions = uniqueSorted(badgeRecords.map(recordYear)).map(function (year) {
      return { value: year, label: year };
    });
    const categoryOptions = uniqueSorted(badgeRecords.map(function (item) {
      return item.badgeCategory || "";
    })).map(function (category) {
      return { value: category, label: category };
    });

    replaceOptions(eventFilter, "All events", eventOptions);
    replaceOptions(yearFilter, "All years", yearOptions);
    replaceOptions(categoryFilter, "All categories", categoryOptions);
  }

  function setSelectValue(select, value) {
    const normalizedValue = normalizeBadgeId(value);
    const option = Array.prototype.find.call(select.options, function (item) {
      return normalizeBadgeId(item.value) === normalizedValue;
    });
    select.value = option ? option.value : "";
  }

  function syncFiltersToRecord(item) {
    setSelectValue(eventFilter, item.eventId);
    setSelectValue(yearFilter, recordYear(item));
    setSelectValue(categoryFilter, item.badgeCategory);
    companyFilter.value = "";
  }

  function clearFilters() {
    eventFilter.value = "";
    yearFilter.value = "";
    categoryFilter.value = "";
    companyFilter.value = "";
  }

  function verifyBadgeId(rawBadgeId, updateUrl) {
    const badgeId = extractBadgeId(rawBadgeId) || normalizeBadgeId(rawBadgeId);
    resetRecord();

    if (!badgeId) {
      activeHighlightId = "";
      input.value = "";
      setMessage("Showing all public PACIO badge records.", "neutral");
      renderRegistryTable("", "");
      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.delete("id");
        window.history.replaceState({}, "", url.toString());
      }
      return;
    }

    const match = badgeRecords.find(function (item) {
      return normalizeBadgeId(item.badgeId) === badgeId;
    });

    if (!match) {
      activeHighlightId = "";
      setMessage("No public PACIO badge record was found for " + badgeId + ".", "warning");
      renderRegistryTable(badgeId, "");
      if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("id", badgeId);
        window.history.replaceState({}, "", url.toString());
      }
      return;
    }

    activeHighlightId = match.badgeId;
    input.value = match.badgeId;
    syncFiltersToRecord(match);
    displayRecord(match);
    renderRegistryTable(match.badgeId, match.badgeId);
    setMessage("Badge record found.", "success");

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("id", match.badgeId);
      window.history.replaceState({}, "", url.toString());
    }
  }

  function loadInitialBadgeId() {
    const params = new URLSearchParams(window.location.search);
    const badgeId = params.get("id");
    if (badgeId) {
      input.value = badgeId;
      verifyBadgeId(badgeId, false);
    } else {
      activeHighlightId = "";
      renderRegistryTable("", "");
    }
  }

  function loadRegistry() {
    setMessage("Loading badge registry...", "neutral");
    return fetch(registryPath, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Registry request failed with status " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        badgeRecords = Array.isArray(data) ? data : [];
        populateFilters();
        setMessage("Enter a badge ID to verify.", "neutral");
        input.disabled = false;
        input.readOnly = false;
        loadInitialBadgeId();
      })
      .catch(function () {
        setMessage("The badge registry could not be loaded. Please try again later.", "error");
      });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    verifyBadgeId(input.value, true);
  });

  input.addEventListener("input", function () {
    activeHighlightId = "";
    resetRecord();
    renderRegistryTable(input.value, "");
    setMessage(input.value ? "Filtering badge records as you type." : "Showing all public PACIO badge records.", "neutral");
  });

  showAllButton.addEventListener("click", function () {
    activeHighlightId = "";
    input.value = "";
    clearFilters();
    resetRecord();
    renderRegistryTable("", "");
    setMessage("Showing all public PACIO badge records.", "neutral");
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url.toString());
    input.focus();
  });

  [eventFilter, yearFilter, categoryFilter].forEach(function (control) {
    control.addEventListener("change", function () {
      activeHighlightId = "";
      resetRecord();
      renderRegistryTable(input.value, "");
      setMessage("Filtering badge records.", "neutral");
    });
  });

  companyFilter.addEventListener("input", function () {
    activeHighlightId = "";
    resetRecord();
    renderRegistryTable(input.value, "");
    setMessage("Filtering badge records.", "neutral");
  });

  clearFiltersButton.addEventListener("click", function () {
    activeHighlightId = "";
    clearFilters();
    resetRecord();
    renderRegistryTable(input.value, "");
    setMessage(input.value ? "Showing records that match the Badge ID field." : "Showing all public PACIO badge records.", "neutral");
    input.focus();
  });

  loadRegistry();
})();
