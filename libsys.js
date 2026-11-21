(function () {
  "use strict";

  const {
    catalog,
    getReservations,
    getRemainingCopies,
    reserve,
    getSession,
    clearSession,
  } = LibraryData;
  const state = { query: "", department: "All", availability: "All" };
  const catalogue = document.querySelector("#catalogue");
  const summary = document.querySelector("#results-summary");
  const searchInput = document.querySelector("#search");
  const toast = document.querySelector("#toast");
  let toastTimer;

  function createButton(label, value, group) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.dataset.group = group;
    button.dataset.value = value;
    button.textContent = label;
    button.setAttribute(
      "aria-pressed",
      value === state[group] ? "true" : "false",
    );
    return button;
  }

  function renderFilters() {
    const departments = [
      "All",
      ...new Set(catalog.map((book) => book.department)),
    ];
    const departmentFilters = document.querySelector("#department-filters");
    const availabilityFilters = document.querySelector("#availability-filters");
    departments.forEach((department) =>
      departmentFilters.append(
        createButton(department, department, "department"),
      ),
    );
    [
      ["All books", "All"],
      ["Available now", "Available"],
      ["Checked out", "Checked out"],
    ].forEach(([label, value]) =>
      availabilityFilters.append(createButton(label, value, "availability")),
    );
  }

  function showToast(message, isError = false) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
  }

  function getVisibleBooks() {
    const searchTerm = state.query.trim().toLocaleLowerCase();
    return catalog.filter((book) => {
      const matchesSearch =
        !searchTerm ||
        [book.title, book.author, book.department, book.isbn].some((value) =>
          value.toLocaleLowerCase().includes(searchTerm),
        );
      const matchesDepartment =
        state.department === "All" || book.department === state.department;
      const isAvailable = !book.checkedOut && getRemainingCopies(book) > 0;
      const matchesAvailability =
        state.availability === "All" ||
        (state.availability === "Available" && isAvailable) ||
        (state.availability === "Checked out" && book.checkedOut);
      return matchesSearch && matchesDepartment && matchesAvailability;
    });
  }

  function createBookCard(book) {
    const isReserved = getReservations().some(
      (reservation) => reservation.bookId === book.id,
    );
    const remaining = getRemainingCopies(book);
    const card = document.createElement("article");
    card.className = "book-card";
    card.setAttribute("role", "listitem");

    const top = document.createElement("div");
    top.className = "book-top";
    const cover = document.createElement("img");
    cover.className = "book-cover";
    cover.src = book.cover;
    cover.alt = `${book.title} book cover`;
    const info = document.createElement("div");
    info.className = "book-info";
    const title = document.createElement("h3");
    title.textContent = book.title;
    const author = document.createElement("p");
    author.className = "book-author";
    author.textContent = `by ${book.author}`;
    const edition = document.createElement("p");
    edition.className = "book-edition";
    edition.textContent = book.edition;
    const isbn = document.createElement("p");
    isbn.className = "book-isbn";
    isbn.textContent = `ISBN ${book.isbn}`;
    info.append(title, author, edition, isbn);
    top.append(cover, info);

    const meta = document.createElement("div");
    meta.className = "book-meta";
    const subject = document.createElement("span");
    subject.className = "tag";
    subject.textContent = book.department;
    const status = document.createElement("span");
    status.className = `status ${book.checkedOut ? "status-unavailable" : "status-available"}`;
    status.textContent = book.checkedOut
      ? "Checked out"
      : isReserved
        ? "Reserved by you"
        : "Available on shelf";
    meta.append(subject, status);

    const footer = document.createElement("div");
    footer.className = "book-card-footer";
    const availability = document.createElement("div");
    availability.className = "availability-copy";
    const availabilityTitle = document.createElement("strong");
    availabilityTitle.textContent = book.checkedOut
      ? "Currently unavailable"
      : `${remaining}/${book.total} on shelf`;
    const availabilityDetail = document.createElement("span");
    availabilityDetail.textContent = book.checkedOut
      ? "Check back later"
      : "Ready for collection";
    availability.append(availabilityTitle, availabilityDetail);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "reserve-btn";
    button.dataset.bookId = book.id;
    button.disabled = book.checkedOut || isReserved || remaining === 0;
    button.textContent = isReserved
      ? "Reserved"
      : book.checkedOut || remaining === 0
        ? "Unavailable"
        : "Reserve";
    footer.append(availability, button);
    card.append(top, meta, footer);
    return card;
  }

  function renderCatalogue() {
    const visibleBooks = getVisibleBooks();
    catalogue.replaceChildren();
    const availableCount = catalog.filter(
      (book) => !book.checkedOut && getRemainingCopies(book) > 0,
    ).length;
    document.querySelector("#available-title-count").textContent =
      availableCount;
    document.querySelector("#reservation-count").textContent =
      getReservations().length;
    summary.textContent = `${visibleBooks.length} ${visibleBooks.length === 1 ? "title" : "titles"} found`;

    if (!visibleBooks.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML =
        "<h3>No matching books</h3><p>Try a different search term or remove a filter.</p>";
      catalogue.append(empty);
      return;
    }
    visibleBooks.forEach((book) => catalogue.append(createBookCard(book)));
  }

  function syncSession() {
    const session = getSession();
    const studentId = document.querySelector("#student-id");
    if (session) {
      studentId.textContent = `ID ${session.registrationNumber}`;
      studentId.hidden = false;
    }
  }

  document.querySelector("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = searchInput.value;
    renderCatalogue();
  });
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderCatalogue();
  });
  document.addEventListener("click", (event) => {
    const filter = event.target.closest(".filter-button");
    if (filter) {
      state[filter.dataset.group] = filter.dataset.value;
      document
        .querySelectorAll(`[data-group="${filter.dataset.group}"]`)
        .forEach((button) => {
          button.setAttribute("aria-pressed", String(button === filter));
        });
      renderCatalogue();
      return;
    }

    const reserveButton = event.target.closest(".reserve-btn");
    if (reserveButton) {
      const result = reserve(reserveButton.dataset.bookId);
      showToast(result.message, !result.ok);
      renderCatalogue();
    }
  });
  document.querySelector("#logout-button").addEventListener("click", () => {
    clearSession();
    window.location.href = "login-copy.html";
  });

  window.addEventListener("storage", renderCatalogue);
  renderFilters();
  syncSession();
  renderCatalogue();
})();
