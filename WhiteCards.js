var cards = [
    "a",
    "b",
    "c"
];

//shuffle every game
for (let i = cards.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
}

//send to game
exports.cards=cards;