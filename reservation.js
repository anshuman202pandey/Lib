let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

let container = document.getElementById("reserved-books");

reservations.forEach(function(book) {

    let para = document.createElement("p");

    para.innerText = book;

    container.appendChild(para);

});