let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

let buttons = document.querySelectorAll(".reserve-btn");

buttons.forEach(function(button) {

    button.addEventListener("click", function() {

        let bookName = button.dataset.book;

        if (reservations.includes(bookName)) {
            alert("You have already reserved this book!");
        }

        else {
            reservations.push(bookName);

            localStorage.setItem("reservations", JSON.stringify(reservations));

            alert("Book reserved successfully!");
        }

    });

});