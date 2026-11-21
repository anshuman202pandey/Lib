/* Shared catalog and browser persistence layer for the static library app. */
(function () {
  "use strict";

  const RESERVATION_KEY = "campus-library-reservations-v2";
  const LEGACY_RESERVATION_KEY = "reservations";
  const SESSION_KEY = "campus-library-session";
  const RESERVATION_WINDOW_MS = 24 * 60 * 60 * 1000;

  const catalog = Object.freeze([
    {
      id: "python-crash-course",
      title: "Python Crash Course",
      author: "Eric Matthes",
      edition: "3rd edition",
      isbn: "978-1718502703",
      department: "Python",
      available: 1,
      total: 6,
      cover: "Python.jpg",
    },
    {
      id: "advanced-engineering-mathematics",
      title: "Advanced Engineering Mathematics",
      author: "Erwin Kreyszig",
      edition: "4th edition",
      isbn: "978-0470458365",
      department: "Mathematics",
      available: 3,
      total: 5,
      cover: "Maths.jpg",
    },
    {
      id: "design-and-build-websites",
      title: "Design and Build Websites",
      author: "Jon Duckett",
      edition: "7th edition",
      isbn: "978-1118093054",
      department: "HTML",
      available: 0,
      total: 0,
      cover: "Html.webp",
      checkedOut: true,
    },
    {
      id: "principles-practice-cpp",
      title: "Principles & Practice Using C++",
      author: "Bjarne Stroustrup",
      edition: "3rd edition",
      isbn: "978-0321714114",
      department: "C++",
      available: 6,
      total: 7,
      cover: "C++.jpeg",
    },
    {
      id: "head-first-java",
      title: "Head First Java",
      author: "Kathy Sierra & Bert Bates",
      edition: "5th edition",
      isbn: "978-1491910771",
      department: "Java",
      available: 0,
      total: 0,
      cover: "java.webp",
      checkedOut: true,
    },
    {
      id: "spring-boot-react",
      title: "Spring Boot and React",
      author: "Juha Hinkula",
      edition: "2nd edition",
      isbn: "978-1839214103",
      department: "Full Stack",
      available: 8,
      total: 9,
      cover: "Full.jpg",
    },
    {
      id: "electrical-engineering",
      title: "Electrical Engineering",
      author: "Erwin Kreyszig",
      edition: "1st edition",
      isbn: "978-0470458365",
      department: "Electrical",
      available: 0,
      total: 0,
      cover: "Electrical.jpg",
      checkedOut: true,
    },
    {
      id: "mechanical-engineering-design",
      title: "Mechanical Engineering Design",
      author: "Richard G. Budynas",
      edition: "11th edition",
      isbn: "978-1118093054",
      department: "Mechanical",
      available: 4,
      total: 7,
      cover: "Mechanical.jpg",
    },
  ]);

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getBook(id) {
    return catalog.find((book) => book.id === id) || null;
  }

  function createReservation(bookId, reservedAt = new Date().toISOString()) {
    const reservedTime = Date.parse(reservedAt);
    const validReservedAt = Number.isNaN(reservedTime)
      ? new Date().toISOString()
      : reservedAt;
    const expiresAt = new Date(
      Date.parse(validReservedAt) + RESERVATION_WINDOW_MS,
    ).toISOString();
    return { bookId, reservedAt: validReservedAt, expiresAt };
  }

  function normalizeReservation(reservation) {
    if (!reservation || !getBook(reservation.bookId)) return null;
    const normalized = createReservation(
      reservation.bookId,
      reservation.reservedAt,
    );
    const expiry = Date.parse(reservation.expiresAt);
    if (!Number.isNaN(expiry)) normalized.expiresAt = reservation.expiresAt;
    return normalized;
  }

  function legacyReservationToCurrent(reservation) {
    const title =
      typeof reservation === "string" ? reservation : reservation?.title;
    const previousTitleIds = {
      "Advanced Eng. Mathematic": "advanced-engineering-mathematics",
      "Mechanical Eng. Design": "mechanical-engineering-design",
    };
    const book =
      catalog.find((item) => item.title === title) ||
      getBook(previousTitleIds[title]);
    return book ? createReservation(book.id) : null;
  }

  function getReservations() {
    const current = readJson(RESERVATION_KEY, null);
    if (Array.isArray(current)) {
      const normalized = current.map(normalizeReservation).filter(Boolean);
      const active = normalized.filter(
        (reservation) => Date.parse(reservation.expiresAt) > Date.now(),
      );
      if (JSON.stringify(current) !== JSON.stringify(active))
        saveReservations(active);
      return active;
    }

    const legacy = readJson(LEGACY_RESERVATION_KEY, []);
    const migrated = Array.isArray(legacy)
      ? legacy.map(legacyReservationToCurrent).filter(Boolean)
      : [];

    if (migrated.length) writeJson(RESERVATION_KEY, migrated);
    return migrated;
  }

  function saveReservations(reservations) {
    writeJson(RESERVATION_KEY, reservations);
  }

  function getReservationsForBook(bookId) {
    return getReservations().filter(
      (reservation) => reservation.bookId === bookId,
    );
  }

  function getRemainingCopies(book) {
    if (!book || book.checkedOut) return 0;
    return Math.max(0, book.available - getReservationsForBook(book.id).length);
  }

  function reserve(bookId) {
    const book = getBook(bookId);
    if (!book) return { ok: false, message: "This book could not be found." };

    const reservations = getReservations();
    if (reservations.some((reservation) => reservation.bookId === bookId)) {
      return {
        ok: false,
        message: "This title is already in your reservations.",
      };
    }

    if (book.checkedOut || getRemainingCopies(book) < 1) {
      return {
        ok: false,
        message: "This title is not available to reserve right now.",
      };
    }

    const reservation = createReservation(bookId);
    reservations.push(reservation);
    saveReservations(reservations);
    return { ok: true, reservation, message: `${book.title} was reserved.` };
  }

  function cancel(bookId) {
    const reservations = getReservations();
    const nextReservations = reservations.filter(
      (reservation) => reservation.bookId !== bookId,
    );
    if (nextReservations.length === reservations.length) {
      return { ok: false, message: "That reservation no longer exists." };
    }

    saveReservations(nextReservations);
    return {
      ok: true,
      message: "Reservation cancelled and the copy is available again.",
    };
  }

  function getSession() {
    const session = readJson(SESSION_KEY, null);
    return session && typeof session.registrationNumber === "string"
      ? session
      : null;
  }

  function setSession(registrationNumber) {
    writeJson(SESSION_KEY, {
      registrationNumber,
      signedInAt: new Date().toISOString(),
    });
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  window.LibraryData = {
    catalog,
    getBook,
    getReservations,
    getRemainingCopies,
    reserve,
    cancel,
    getSession,
    setSession,
    clearSession,
    getTimeRemaining(expiresAt) {
      return Math.max(0, Date.parse(expiresAt) - Date.now());
    },
    formatDate(date) {
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    },
  };
})();
