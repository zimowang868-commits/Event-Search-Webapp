const IPINFO_TOKEN = "YOUR_IPINFO_TOKEN";
const GMAPS_GEOCODE_KEY = "YOUR_GOOGLE_MAPS_GEOCODE_KEY";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("searchForm");
    const keyword = document.getElementById("keyword");
    const distance = document.getElementById("distance");
    const category = document.getElementById("category");
    const autoDetect = document.getElementById("autoDetect");
    const locationInput = document.getElementById("location");

    const resultsSection = document.getElementById("resultsSection");
    const eventsBody = document.getElementById("eventsBody");
    const noResults = document.getElementById("noResults");

    const detailsSection = document.getElementById("detailsSection");
    const eventDetailsBox = document.getElementById("eventDetails");
    const venueToggle = document.getElementById("venueToggle");
    const showVenueBtn = document.getElementById("showVenueBtn");
    const venueDetailsBox = document.getElementById("venueDetails");

    let currentRows = [];
    let originalRows = [];
    let sortKey = null;
    let sortDir = "asc";

    document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
        const text = th.textContent.trim();
        th.innerHTML = `<span class="th-text">${text}</span><span class="tri"><i class="up"></i><i class="down"></i></span>`;
    });

    function updateHeaderTextWidths(){
        document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
            const txt = th.querySelector(".th-text");
            if (txt) th.style.setProperty("--txtw", `${txt.offsetWidth}px`);
        });
    }
    updateHeaderTextWidths();
    window.addEventListener("resize", updateHeaderTextWidths);

    function show(el) { el.classList.remove("hidden"); }
    function hide(el) { el.classList.add("hidden"); }

    distance.addEventListener("focus", () => {
        if (!distance.value) distance.value = 10;
    });

    function syncLocation() {
        const useAuto = autoDetect.checked;
        locationInput.style.display = useAuto ? "none" : "block";
        if (useAuto) {
            locationInput.removeAttribute("required");
            locationInput.setCustomValidity("");
        } else {
            locationInput.setAttribute("required", "required");
        }
    }

    autoDetect.addEventListener("change", syncLocation);
    syncLocation();
    keyword.addEventListener("input", () => { keyword.setCustomValidity(""); });
    locationInput.addEventListener("input", () => { locationInput.setCustomValidity(""); });

    async function ipinfoLatLon() {
        const token = IPINFO_TOKEN ? `?token=${encodeURIComponent(IPINFO_TOKEN)}` : "";
        const r = await fetch(`https://ipinfo.io/json${token}`);
        if (!r.ok) throw new Error("ipinfo failed");
        const j = await r.json();
        if (!j.loc) throw new Error("ipinfo missing loc");
        const [lat, lon] = j.loc.split(",").map(Number);
        return { lat, lon };
    }

    async function geocodeGoogle(q) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${encodeURIComponent(GMAPS_GEOCODE_KEY)}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error("geocoding failed");
        const j = await r.json();
        if (j.status !== "OK" || !j.results?.length) throw new Error("location not found");
        const { lat, lng } = j.results[0].geometry.location;
        return { lat, lon: lng };
    }

    function formatDate(ev) {
        const d = ev?.dates?.start;
        return {
            date: d?.localDate || "",
            time: d?.localTime || ""
        };
    }

    function firstImage(ev) {
        const imgs = ev?.images || [];
        const pick = imgs.find(x => x.width >= 200) || imgs[0];
        if (!pick) return "";
        if (pick.url.includes("placeholder") || pick.url.includes("default")) return "";
        return pick.url;
    }

    function firstVenueName(ev) {
        return ev?._embedded?.venues?.[0]?.name || "—";
    }

    function firstGenre(ev) {
        return ev?.classifications?.[0]?.segment?.name || "—";
    }

    function buildRowsFromTM(events) {
        return events.map(ev => {
            const dt = formatDate(ev);
            return {
                id: ev?.id || "",
                date: dt.date,
                time: dt.time,
                icon: firstImage(ev),
                name: ev?.name || "—",
                genre: firstGenre(ev),
                venue: firstVenueName(ev)
            };
        });
    }

    function renderTable(rows) {
        eventsBody.innerHTML = "";
        rows.forEach(r => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div class="date-cell">
                        <div class="date-top">${r.date || "—"}</div>
                        <div class="date-bottom">${r.time || ""}</div>
                    </div>
                </td>
                <td>${r.icon ? `<img class="event-icon" src="${r.icon}" alt="">` : ""}</td>
                <td>${r.id ? `<a href="#" class="evt-link" data-id="${r.id}">${r.name}</a>` : r.name}</td>
                <td>${r.genre}</td>
                <td>${r.venue}</td>
            `;
            eventsBody.appendChild(tr);
        });
    }

    function sortRows(key) {
        if (sortKey !== key) {
            sortKey = key;
            sortDir = "asc";
        } else if (sortDir === "asc") {
            sortDir = "desc";
        } else if (sortDir === "desc") {
            sortKey = null;
            sortDir = "asc";
            currentRows = [...originalRows];
            renderTable(currentRows);
            document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
                th.classList.remove("sorted-asc", "sorted-desc");
            });
            return;
        }
        const factor = sortDir === "asc" ? 1 : -1;
        currentRows.sort((a, b) => {
            const va = (a[key] || "").toLowerCase();
            const vb = (b[key] || "").toLowerCase();
            return va > vb ? factor : va < vb ? -factor : 0;
        });
        renderTable(currentRows);

        document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
            th.classList.remove("sorted-asc", "sorted-desc");
        });
        const activeTh = document.querySelector(`#eventsTable th.sortable[data-key="${key}"]`);
        if (activeTh) {
            activeTh.classList.add(sortDir === "asc" ? "sorted-asc" : "sorted-desc");
        }
    }

    document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
        th.addEventListener("click", () => sortRows(th.dataset.key));
    });

    function formatMoney(n, currency) {
        if (n == null || isNaN(n)) return null;
        const s = Number(n).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
        return currency ? `${s} ${currency}` : s;
    }

    function buildPriceRanges(priceRanges) {
        if (!Array.isArray(priceRanges) || priceRanges.length === 0) return "";
        const parts = [];
        for (const p of priceRanges) {
            const cur = p?.currency || "";
            const min = formatMoney(p?.min, cur);
            const max = formatMoney(p?.max, cur);
            if (min && max) {
                const c = cur || (min.split(" ").pop() || "");
                const minOnly = min.replace(` ${c}`, "");
                const maxOnly = max.replace(` ${c}`, "");
                parts.push(`${minOnly} - ${maxOnly}${c ? " " + c : ""}`);
            } else if (min) {
                parts.push(min);
            } else if (max) {
                parts.push(max);
            }
        }
        const uniq = [...new Set(parts.filter(Boolean))];
        return uniq.join(", ");
    }

    function joinGenresFromClassifications(cls) {
        if (!cls || !cls.length) return "";
        const c = cls[0];
        const parts = [c.subGenre?.name, c.genre?.name, c.segment?.name, c.subType?.name, c.type?.name]
            .filter(Boolean)
            .filter(s => s.toLowerCase() !== "undefined");
        return parts.join(" | ");
    }

    function statusBadge(code) {
        const map = {
            onsale: { text: "On Sale", cls: "badge-success" },
            offsale: { text: "Off Sale", cls: "badge-danger" },
            canceled: { text: "Canceled", cls: "badge-dark" },
            postponed: { text: "Postponed", cls: "badge-warn" },
            rescheduled: { text: "Rescheduled", cls: "badge-warn" }
        };
        const key = (code || "").toLowerCase();
        const m = map[key];
        return m ? `<span class="badge ${m.cls}">${m.text}</span>` : "";
    }

    function linkArtists(attractions) {
        if (!attractions || !attractions.length) return "";
        return attractions
            .map(a => {
                const nm = a?.name || "";
                if (!nm) return "";
                const url = `https://www.ticketmaster.com/search?q=${encodeURIComponent(nm)}`;
                return `<a target="_blank" rel="noopener" href="${url}">${nm}</a>`;
            })
            .filter(Boolean)
            .join(" | ");
    }

    function eventField(label, valueHtml) {
        if (!valueHtml) return "";
        return `
            <div class="ev-field">
                <div class="ev-label">${label}</div>
                <div class="ev-value">${valueHtml}</div>
            </div>
        `;
    }

    function renderEventCard(data) {
        const title = data?.name || "";
        const ds = data?.dates?.start || {};
        const dateStr = [ds.localDate || "", ds.localTime || ""].filter(Boolean).join(" ");

        const artistsHtml = linkArtists(data?._embedded?.attractions || []) || "N/A";
        const venueName = data?._embedded?.venues?.[0]?.name || "";
        const genres = joinGenresFromClassifications(data?.classifications || "");
        const priceStr = buildPriceRanges(data?.priceRanges || []);
        const status = statusBadge(data?.dates?.status?.code);
        const buyUrl = data?.url || "";
        const seatmap = data?.seatmap?.staticUrl || "";

        const leftCols = [
            eventField("Date", dateStr || "N/A"),
            eventField("Artist/Team", artistsHtml),
            eventField("Venue", venueName || "N/A"),
            eventField("Genres", genres),
            eventField("Price Ranges", priceStr || ""),
            eventField("Ticket Status", status || "N/A"),
            buyUrl ? eventField("Buy Ticket At:", `<a target="_blank" rel="noopener" href="${buyUrl}">Ticketmaster</a>`) : ""
        ].join("");

        const rightCol = seatmap ? `<img class="seatmap" src="${seatmap}" alt="Seat Map">` : "";

        eventDetailsBox.innerHTML = `
            <article class="detail-card">
                <h2 class="ev-title">${title}</h2>
                <div class="ev-grid">
                    <div class="ev-left">
                        ${leftCols}
                    </div>
                    <div class="ev-right">
                        ${rightCol}
                    </div>
                </div>
            </article>
        `;

        if (venueName) {
            show(venueToggle);
            venueDetailsBox.classList.add("hidden");
            showVenueBtn.onclick = async () => {
                venueToggle.classList.add("hidden");
                try {
                    const r = await fetch(`/api/venue?keyword=${encodeURIComponent(venueName)}`);
                    if (!r.ok) throw new Error("venue request failed");
                    const vj = await r.json();
                    renderVenueCardFromResponse(vj);
                    show(venueDetailsBox);
                    venueDetailsBox.scrollIntoView({ behavior: "smooth" });
                } catch (err) {
                    console.error(err);
                }
            };
        } else {
            venueToggle.classList.add("hidden");
            venueDetailsBox.classList.add("hidden");
        }
    }

    function renderVenueCardFromResponse(vjson) {
        const v = vjson?._embedded?.venues?.[0];
        if (!v) {
            venueDetailsBox.innerHTML =
                `<article class="venue-card"><div class="venue-missing">Venue not found</div></article>`;
            return;
        }

        const name = v.name || "N/A";
        const line1 = v.address?.line1 || "N/A";
        const city = v.city?.name || "";
        const state = v.state?.stateCode || "";
        const postal = v.postalCode || "N/A";
        const moreUrl = v.url || "";
        const logo = v.images?.[0]?.url || "";

        const cityState = [city, state].filter(Boolean).join(", ") || "N/A";
        const addrFull = [name, line1, cityState, postal].filter(Boolean).join(", ");
        const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrFull)}`;

        venueDetailsBox.innerHTML = `
            <article class="venue-card">
                <div class="venue-head">
                    <h3 class="venue-name">${name}</h3>
                </div>

                ${logo ? `<img class="venue-logo" src="${logo}" alt="">` : ""}

                <div class="venue-two-col">
                    <div class="venue-left">
                        <div class="venue-row"><strong>Address:</strong> ${line1}</div>
                        <div class="venue-row"><strong>City:</strong> ${cityState}</div>
                        <div class="venue-row"><strong>Postal Code:</strong> ${postal}</div>
                        <div class="venue-links" style="margin-top:14px">
                            <a class="venue-link" target="_blank" rel="noopener" href="${gmaps}">Open in Google Maps</a>
                        </div>
                    </div>

                    <div class="venue-axis"></div>

                    <div class="venue-right">
                        <div class="venue-links">
                            ${moreUrl ? `<a class="venue-link" target="_blank" rel="noopener" href="${moreUrl}">
                                More events at this venue
                            </a>` : ""}
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    eventsBody.addEventListener("click", async (e) => {
        const a = e.target.closest(".evt-link");
        if (!a) return;
        e.preventDefault();
        const id = a.dataset.id;
        try {
            const r = await fetch(`/api/event?id=${encodeURIComponent(id)}`);
            if (!r.ok) throw new Error("event request failed");
            const data = await r.json();
            renderEventCard(data);
            show(detailsSection);
            eventDetailsBox.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            console.error(err);
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        keyword.setCustomValidity("");
        locationInput.setCustomValidity("");
        if (!keyword.value.trim()) {
            keyword.setCustomValidity("Please fill out this field.");
            keyword.reportValidity();
            return;
        }
        if (!autoDetect.checked && !locationInput.value.trim()) {
            locationInput.setCustomValidity("Please fill out this field.");
            locationInput.reportValidity();
            return;
        }

        const dist = Number(distance.value) || 10;
        const cat = category.value || "";

        try {
            let lat, lon;
            if (autoDetect.checked) {
                ({ lat, lon } = await ipinfoLatLon());
            } else {
                ({ lat, lon } = await geocodeGoogle(locationInput.value.trim()));
            }

            const qs = new URLSearchParams({
                keyword: keyword.value.trim(),
                distance: String(dist),
                category: cat,
                lat: String(lat),
                lon: String(lon)
            });

            const resp = await fetch(`/api/search?${qs.toString()}`, {
                method: "GET",
                headers: { "Accept": "application/json" }
            });
            if (!resp.ok) throw new Error(`server ${resp.status}`);
            const data = await resp.json();

            const events = data?._embedded?.events || [];
            if (!events.length) {
                show(resultsSection);
                renderTable([]);
                hide(eventsBody.parentElement);
                show(noResults);
                document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
                    th.classList.remove("sorted-asc", "sorted-desc");
                });
                if (detailsSection) detailsSection.classList.add("hidden");
                eventDetailsBox.innerHTML = "";
                venueDetailsBox.innerHTML = "";
                venueToggle?.classList.add("hidden");
                return;
            }

            originalRows = buildRowsFromTM(events.slice(0, 20));
            currentRows = [...originalRows];
            renderTable(currentRows);

            show(resultsSection);
            show(eventsBody.parentElement);
            hide(noResults);

            document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
                th.classList.remove("sorted-asc", "sorted-desc");
            });
            sortKey = null;
            sortDir = "asc";

            updateHeaderTextWidths();

            if (detailsSection) detailsSection.classList.add("hidden");
            eventDetailsBox.innerHTML = "";
            venueDetailsBox.innerHTML = "";
            venueToggle?.classList.add("hidden");

        } catch (err) {
            show(resultsSection);
            renderTable([]);
            hide(eventsBody.parentElement);
            noResults.textContent = "No records found";
            show(noResults);
            document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
                th.classList.remove("sorted-asc", "sorted-desc");
            });
            sortKey = null;
            sortDir = "asc";
            if (detailsSection) detailsSection.classList.add("hidden");
            eventDetailsBox.innerHTML = "";
            venueDetailsBox.innerHTML = "";
            venueToggle?.classList.add("hidden");
        }
    });

    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            keyword.value = "";
            distance.value = "";
            distance.placeholder = "10";
            category.selectedIndex = 0;
            locationInput.value = "";
            autoDetect.checked = false;
            syncLocation();

            hide(resultsSection);
            eventsBody.innerHTML = "";
            hide(noResults);

            document.querySelectorAll("#eventsTable th.sortable").forEach(th => {
                th.classList.remove("sorted-asc", "sorted-desc");
            });
            sortKey = null;
            sortDir = "asc";
            originalRows = [];
            currentRows = [];

            updateHeaderTextWidths();

            if (detailsSection) detailsSection.classList.add("hidden");
            eventDetailsBox.innerHTML = "";
            venueDetailsBox.innerHTML = "";
            venueToggle?.classList.add("hidden");
        });
    }
});