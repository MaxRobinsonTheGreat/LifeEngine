const CellTypes = {
    empty: 0,
    food: 1,
    wall: 2,
    mouth: 3,
    producer: 4,
    mover: 5,
    killer: 6,
    armor: 7,
    colors: ['#121D29', 'green', 'gray', 'orange', 'white', 'blue', 'red', 'purple'],
    getRandomLivingType: function(){
        return Math.floor(Math.random() * 5) + 3;
    }
}

module.exports = CellTypes;
