(function () {
  "use strict";

  const container = document.querySelector("#reserved-books");
  const summary = document.querySelector("#reservation-summary");
  const toast = document.querySelector("#toast");
  let toastTimer;

  function showToast(message, isError = false) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
  }

  function createReservationCard(reservation) {
    const book = LibraryData.getBook(reservation.bookId);
    const card = document.createElement("article");
    card.className = "reservation-card";
    const image = document.createElement("img");
    image.src = book.cover;
    image.alt = `${book.title} book cover`;
    const details = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = book.title;
    const author = document.createElement("p");
    author.textContent = `by ${book.author} · ${book.edition}`;
    const collection = document.createElement("p");
    collection.textContent = `Collection: ${book.department} · ISBN ${book.isbn}`;
    const reserved = document.createElement("span");
    reserved.className = "status status-available";
    reserved.textContent = `Reserved ${LibraryData.formatDate(reservation.reservedAt)}`;
    const timer = document.createElement("p");
    timer.className = "reservation-timer";
    timer.dataset.expiresAt = reservation.expiresAt;
    details.append(title, author, collection, reserved, timer);
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel-btn";
    cancelButton.dataset.bookId = book.id;
    cancelButton.textContent = "Cancel reservation";
    card.append(image, details, cancelButton);
    return card;
  }

  function renderReservations() {
    const reservations = LibraryData.getReservations().sort(
      (a, b) => new Date(b.reservedAt) - new Date(a.reservedAt),
    );
    container.replaceChildren();
    summary.textContent = `${reservations.length} active ${reservations.length === 1 ? "reservation" : "reservations"}`;

    if (!reservations.length) {
      const empty = document.createElement("div");
      empty.className = "empty-reservations";
      empty.innerHTML =
        '<h2>No reservations yet</h2><p>Browse the collection to set aside a book for your next visit.</p><a class="button button-primary" href="libsys.html">Browse catalogue</a>';
      container.append(empty);
      return;
    }
    reservations.forEach((reservation) =>
      container.append(createReservationCard(reservation)),
    );
    updateCountdowns();
  }

  function formatCountdown(milliseconds) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  function updateCountdowns() {
    let reservationExpired = false;
    container.querySelectorAll(".reservation-timer").forEach((timer) => {
      const remaining = LibraryData.getTimeRemaining(timer.dataset.expiresAt);
      if (!remaining) {
        reservationExpired = true;
        return;
      }
      timer.textContent = `Hold confirmation: ${formatCountdown(remaining)} remaining`;
    });

    if (reservationExpired) {
      LibraryData.getReservations();
      renderReservations();
    }
  }

  container.addEventListener("click", (event) => {
    const cancelButton = event.target.closest(".cancel-btn");
    if (!cancelButton) return;
    const book = LibraryData.getBook(cancelButton.dataset.bookId);
    if (!window.confirm(`Cancel your reservation for “${book.title}”?`)) return;
    const result = LibraryData.cancel(book.id);
    showToast(result.message, !result.ok);
    renderReservations();
  });
  document.querySelector("#logout-button").addEventListener("click", () => {
    LibraryData.clearSession();
    window.location.href = "login-copy.html";
  });

  window.addEventListener("storage", renderReservations);
  renderReservations();
  window.setInterval(updateCountdowns, 1000);
})();
