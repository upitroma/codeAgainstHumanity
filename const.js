var constants = {


    //gameplay
    NSFW: true,
    cardsPerHand: 6,
    choosingTimer:10,
    voteingTimer:5,
    resultsTimer:5,
    newRoundTimer:6,

    //BanBot™
    hackerSuspicionThreshold: 100,
    maxByteSize: 200,
    maxMessagesPerSecond: 1,
    playingMultipleCardsPunish: 20,
    voteingMoreThanOncePunish: 20,
    largeMessagePunish: 30,
    htmlInjectionPunish: 10,
    spammingPunish:5,

    //strings
    //TODO: add more
    strChooseCard: "Choose a card",
    strNewRound: "Next Round",
    strVoteCard: "Vote for your favorite",
    strResults: "Round Results",
    outOfCards: "I'm all out of cards. Feel free to make your own and send them to me. I'll try to add them in. Just burn a card or something.",
}

exports.constants=constants;