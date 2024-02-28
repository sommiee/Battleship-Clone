document.addEventListener('DOMContentLoaded', function() {

    //initializing global variables to be used
    const userCanvas = document.getElementById('userCanvas');
    const userCtx = userCanvas.getContext('2d');

    const pcCanvas = document.getElementById('pcCanvas');
    const pcCtx = pcCanvas.getContext('2d');

    const gridSize = 10;
    const cellSize = userCanvas.width / gridSize;
    
    const explosionSound = new Audio('explosion.mp3');
    explosionSound.volume = 0.6;

    //counters
    let userHitCounter = 0;
    let pcHitCounter = 0;
    let userMissCounter = 0;
    let pcMissCounter = 0;

    //tracking ship locations
    let currentShip = null;
    let shipLocations = [];
    let tempShipLocations = [];

    let isPlacingShip = false;

    //these keep track of the game score
    let gameWon = false;
    const clickedGrids = [];
    for (let i = 0; i < gridSize; i++) {
        clickedGrids[i] = [];
        for (let j = 0; j < gridSize; j++) {
            clickedGrids[i][j] = false;
        }
    }

    //these are the types of ships that will be placed, along with their lengths
    const shipsData = [
        { type: 'destroyer', length: 2 },
        { type: 'submarine', length: 3 },
        { type: 'cruiser', length: 3 },
        { type: 'battleship', length: 4 },
        { type: 'carrier', length: 5 }
    ];


    //Message that guides the user through the game(updated throughout the code)
    const placementMessage = document.getElementById('placement-message');

    //retrieves the buttons
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-game-button');

    //waits for user to click start. then they can start placing their ships on the board
    startButton.addEventListener('click', function () {
        startPlacingShip('destroyer');
        startButton.disabled = true;
    });


    // Event listener for clicks on the canvas
    userCanvas.addEventListener('click', function (event) {
        handleCanvasClick(event, userCanvas, userCtx);
    });

    
    //this updates a variable to let the system know that the game is over and halt further bombings
    function gameOverBoardClick(event, canvas, ctx, pcShipLocations) {
        if (gameWon) {
            alert("GAME OVER! Click 'Restart Game' to play again.");
            return;
        }
    }
    

    //Handles canvas clicks during ship placement
    function handleCanvasClick(event, canvas, ctx) {
        let isValidLocation = false;
        const  actualuserLoc = [];
        if (isPlacingShip) {
            //Converts the mouse clicks to actual coordinates on the grid
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const gridX = Math.floor(x / cellSize);
            const gridY = Math.floor(y / cellSize);
            
            //checks that the user selected a location that is free and within the grid dimensions
            isValidLocation = checkAdjacentCells(shipLocations, gridX, gridY, gridSize, currentShip.length);
            if (isValidLocation) {
                //if the ship location is valid, it will be drawn on the canvas
                drawShip(ctx, gridX, gridY, currentShip.length);

                for (let i = 0; i < currentShip.length; i++) {
                    actualuserLoc.push({ x: gridX + i, y: gridY });
                } 

                //This stores the ship's final location
                shipLocations.push({ type: currentShip.type, locations: actualuserLoc }); 

                //Checks if all ships are placed, and if so, the Pc then selects its ship locations and tehh game begins
                if (shipLocations.length === shipsData.length) {
                    isPlacingShip = false;
                    tempShipLocations = shipLocations.slice();
                    placementMessage.innerText = `PC is picking it's ship locations...`;
                    placementMessage.style.display = 'block';
                    setTimeout(function() {
                        startGame()
                    }, 4000);
                } else {
                    // Start placing the next ship when placement is complete
                    startPlacingNextShip();
                }
            }
            //alert message for if the user selected an invalid location
            else {
                alert('YOU CANNOT PLACE A SHIP HERE!');
            }
        }
    
    }
    //When the game starts, the PC's board is enabled so the user can click on it
    function handlePCBoardClick(event, canvas, ctx, pcShipLocations) {
        if (gameWon) {
            return;
        }

        //converts the location of the mosue click into grid coordinates
        const rect = canvas.getBoundingClientRect();
        const gridX = Math.floor((event.clientX - rect.left) / cellSize);
        const gridY = Math.floor((event.clientY - rect.top) / cellSize);

        //checks if the grid the user clicked has already been hit before and alerts the user if it is
        if (clickedGrids[gridY][gridX]) {
            console.log(clickedGrids);
            alert('This cell has already been clicked. Please choose another cell.');
            return;
        }
        console.log(clickedGrids);
        clickedGrids[gridY][gridX] = true;//updates the array of hit grids

        //identifies if the selected grid contained part of a ship
        const hitShip = pcShipLocations.find(ship => {
            return ship.locations.some(location => (
                gridX === location.x && 
                gridY === location.y
            ));   
        });

        // Update the display based on if the user hit or miss
        if (hitShip) {
            //plays sound, and visual on hit cell
            explosionSound.play();
            const bombImage = new Image();
            bombImage.src = 'bomb.png';
            bombImage.onload = function () {
                ctx.drawImage(bombImage, gridX * cellSize, gridY * cellSize, cellSize, cellSize);
                };
                ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize);
                //update the counter
                userHitCounter++;
                updateUserHitCounter(userHitCounter);
                
                //next block keep track of which ships were hit in order to highlight a ship when its fully destroyed
                tempArr = tempArr.map(ship => ({
                    ...ship,
                    locations: ship.locations.filter(location => location.x !== gridX || location.y !== gridY)
                }));
                const shipWithEmptyLocations = tempArr.find(ship => ship.locations.length === 0);

                if (shipWithEmptyLocations) {
                    const emptyShipType = shipWithEmptyLocations.type;
                    const matchingShip = pcShipLocations.find(ship => ship.type === emptyShipType);

                    if (matchingShip) {
                        // Iterate through the locations of the destroyed ship and fills in the cells
                        matchingShip.locations.forEach(location => {
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                            ctx.fillRect(location.x * cellSize, location.y * cellSize, cellSize, cellSize);
                            placementMessage.innerText = `You destroyed your opponent's ${emptyShipType}!`;
                            placementMessage.style.display = 'block';
                        });
                    }
                    
                    //handles when the user has destroyed all the ships
                    const matchingShipIndex = tempArr.findIndex(ship => ship.type === emptyShipType);
                    tempArr = tempArr.filter((_, index) => index !== matchingShipIndex);
                    if (tempArr.length === 0) {
                        gameWon = true;
                        //alert message to let the user know that theyve won
                        placementMessage.innerText = `YOU WIN!`;
                        placementMessage.style.display = 'block';
                        pcCanvas.removeEventListener('click', function(event) {
                            handlePCBoardClick(event, canvas, ctx, pcShipLocations);
                        });
                        //makes sure the user cant keepin playing after they won
                        pcCanvas.addEventListener('click', function(event) {
                            gameOverBoardClick(event, canvas, ctx, pcShipLocations);
                        });
                        //enables the restart button so the user can restart the game
                        restartButton.addEventListener('click', restartGame);
                        alert("Congratulations! You won!");
                    return;
                    }
                }
            }
        else {
             // If it's a miss, fill the cell in with grey and update the miss counter
            ctx.fillStyle = 'rgba(169, 169, 169, 0.7)';
            ctx.fillRect(gridX * cellSize, gridY * cellSize, cellSize, cellSize);
            userMissCounter++;
            updateUserMissCounter(userMissCounter);
        }
        //lets the user know that its is the PC's turn
        setTimeout(function() {
            placementMessage.innerText = `PC is thinking...`;
            placementMessage.style.display = 'block';
          }, 2000);
        
        setTimeout(function() {
            pcPlay(gridSize, userCanvas, userCtx);
          }, 4000);
    }

//function that controls the PC's play
    function pcPlay(gridSize, canvas, ctx) {
        //generates an random coordinate for the PC to play and checks if it is valid (free and within the grid bounds)
        let randX, randY;
        let validGrid = false;
        while (!validGrid) {
            randX = Math.floor(Math.random() * gridSize);
            randY = Math.floor(Math.random() * gridSize);
            validGrid = !clickedGrids[randY][randX];
        }
        //checks if the PC's selected coordinates hit one of the user ships
        const hitYourShip = shipLocations.find(ship => {
            return ship.locations.some(location => (
                randX === location.x &&
                randY === location.y
            ));
        });
        
        //if the PC hits the user's ship, teh hit counter is incremented and there is a bomb picture and a sound
        if (hitYourShip) {
            pcHitCounter++;
            updatePcHitCounter(pcHitCounter);
            explosionSound.play();
            const bombImage = new Image();
            bombImage.src = 'bomb.png';
            bombImage.onload = function () {
                ctx.drawImage(bombImage, randX * cellSize, randY * cellSize, cellSize, cellSize);
                };
                ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.fillRect(randX * cellSize, randY * cellSize, cellSize, cellSize); 

                //handles the destruction of ships
                tempShipLocations = tempShipLocations.map(ship => ({
                    ...ship,
                    locations: ship.locations.filter(location => location.x !== randX || location.y !== randY)
                }));

                //if a ship is fully destroyed, highlight it
                const shipWithEmptyLocations = tempShipLocations.find(ship => ship.locations.length === 0);

                if (shipWithEmptyLocations) {
                    const emptyShipType = shipWithEmptyLocations.type;
                    const matchingShip = shipLocations.find(ship => ship.type === emptyShipType);
                    
                    if (matchingShip) {
                        matchingShip.locations.forEach(location => {
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                            ctx.fillRect(location.x * cellSize, location.y * cellSize, cellSize, cellSize);
                        });
                    }
                    //let the user know that the PC destroyed their ship
                    placementMessage.innerText = `Your ${emptyShipType} has been destroyed!`;
                    placementMessage.style.display = 'block';
                    const matchingShipIndex = tempShipLocations.findIndex(ship => ship.type === emptyShipType);
                    tempShipLocations = tempShipLocations.filter((_, index) => index !== matchingShipIndex);
                    //handles when the PC wins the game
                    if (tempShipLocations.length === 0) {
                        gameWon = true;
                        placementMessage.innerText = `YOU LET THE PC BEAT YOU? THATS CRAZYYY YOU LOST!`; // play aww sound
                        placementMessage.style.display = 'block';
                        restartButton.addEventListener('click', restartGame);
                        return;
                    }
                }
        } else {
            // If it's a miss, the cell is fill in with grey and the miss counter is updated
            ctx.fillStyle = 'grey';
            ctx.fillRect(randX * cellSize, randY * cellSize, cellSize, cellSize);
            pcMissCounter++;
            updatePcMissCounter(pcMissCounter);
        }
        //it is now the users turn
        placementMessage.innerText = `It's your turn.`;
        placementMessage.style.display = 'block';

    }

    //Function for when the restart button is clicked (the necessary variables are reset)
    function restartGame() {
        startButton.removeAttribute('disabled');
        gameWon = false;

        placementMessage.innerText = `CLICK START`;
        placementMessage.style.display = 'block';

        //clears the previous canvases and redraws them
        clearCanvas(userCanvas, userCtx);
        clearCanvas(pcCanvas, pcCtx);
        initGame(); 
        
        restartButton.removeEventListener('click', restartGame);
        // randomize pc ship locations for the next game
        tempArr = pcShipLocations = generateRandomShipLocations(gridSize, shipsData);

        //make all cells in clicked grids false
        pcCanvas.removeEventListener('click', handlePCBoardClick);
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                clickedGrids[i][j] = false;
            }
        }
        pcMissCounter = 0;
        pcHitCounter = 0;
        userMissCounter = 0;
        userHitCounter = 0;
        updateUserHitCounter(userHitCounter);
        updatePcHitCounter(pcHitCounter);
        updatePcMissCounter(pcMissCounter);
        updateUserMissCounter(userMissCounter);

        pcCanvas.addEventListener('click', handlePCBoardClick);
        shipLocations = [];
        currentShip = shipsData[0];
        startButton.addEventListener('click', function () {
            startPlacingShip(currentShip.type);
            startButton.disabled = true;
        });
        
    }
    
    //Function to clear the canvas
    function clearCanvas(canvas, ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    //Function for when the user starts placing the ships (in the shipData array)
    function startPlacingShip(shipType) {
        currentShip = shipsData.find(ship => ship.type === shipType);

        placementMessage.innerText = `Player, place your ${currentShip.type}.`;
        placementMessage.style.display = 'block';
        isPlacingShip = true;
    }

    // Function to start placing the next ship
    function startPlacingNextShip() {
        if(isPlacingShip) {
            const nextShipIndex = shipLocations.length;
            if (nextShipIndex < shipsData.length) {
                const nextShipType = shipsData[nextShipIndex].type;
        
                // Show the placement message for the next ship
                placementMessage.innerText = `Player, place your ${nextShipType}.`;
                placementMessage.style.display = 'block';
                startButton.disabled = false;
        
                // Set the current ship to the next ship type
                currentShip = shipsData.find(ship => ship.type === nextShipType);
            }
        }
    }

    //Functions for updating the counters after each turn
    function updateUserHitCounter(counter) {
        document.getElementById('userHitCounter').innerText = counter;
    }
    function updateUserMissCounter(counter) {
        document.getElementById('userMissCounter').innerText = counter;
    }
    function updatePcHitCounter(counter) {
        document.getElementById('pcHitCounter').innerText = counter;
    }
    function updatePcMissCounter(counter) {
        document.getElementById('pcMissCounter').innerText = counter;
    }


    // Function to draw the ship the user selects on the canvas
    function drawShip(ctx, x, y, length) {
        ctx.fillStyle = 'white';
        for (let i = 0; i < length; i++) {
            ctx.fillRect((x + i) * cellSize, y * cellSize, cellSize, cellSize);
            ctx.strokeRect((x + i) * cellSize, y * cellSize, cellSize, cellSize);
        }
        drawBoard(ctx);
    }

    //Draws the game board
    function drawBoard(ctx) {
        ctx.strokeStyle = 'dark grey';
        ctx.lineWidth = 2;

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
    }

    //draws the context for the user and PC    
    function initGame() {
        drawBoard(userCtx);
        drawBoard(pcCtx);
    }

    //Generates random and valid ship locations for the PC's ships
    function generateRandomShipLocations(gridSize, shipsData) {
        const pcShipLocations = [];

        shipsData.forEach(ship => {
            const tempLocations = [];//stores ship coordinates


            // Keep generating random coordinates until a valid location is found
            let isValidLocation = false;
            let x, y;
            while (!isValidLocation) {
                x = Math.floor(Math.random() * gridSize);
                y = Math.floor(Math.random() * gridSize);
                isValidLocation = checkAdjacentCells(pcShipLocations, x, y, gridSize, ship.length);
            }
                for (let i = 0; i<ship.length; i++) {
                    tempLocations.push({x: x+i, y: y});
                }
                pcShipLocations.push({type: ship.type, locations: tempLocations});
        }); 
    
        return pcShipLocations;
    }

    // Function to check if the cells are valid for selction
    function checkAdjacentCells(pcShipLocations, x, y, gridSize, shipLength) {
        for (let i = 0; i < shipLength; i++) {
            const rightCell = { x: x + i, y };

            //Checks if the  cell is within the grid boundaries
            if (rightCell.x >= 0 && rightCell.x < gridSize && rightCell.y >= 0 && rightCell.y < gridSize) {
                //Checks if the  cell is already occupied by another ship
                if (pcShipLocations.some(ship => ship.locations.some(location => location.x === rightCell.x && location.y === rightCell.y))) {
                    //if its already occupied, the location is not valid
                    return false;
                }
            } else {
                //if its outside the grid boundaries, the location is not valid
                return false;
            }
        }
        return true;
    }

    let pcShipLocations, tempArr;
    tempArr = pcShipLocations = generateRandomShipLocations(gridSize, shipsData);
    
    //Function for when the user has pick its ship lcoations and the game is  reday to start
    function startGame() {
        gameWon = false;
        console.log('PC Ship indexes:', pcShipLocations);
        console.log('temp indexes:', tempArr);
        placementMessage.innerText = `The PC has placed its Ships. You can start playing.`;
        placementMessage.style.display = 'block';
        pcCanvas.addEventListener('click', function(event) {
            handlePCBoardClick(event, pcCanvas, pcCtx, pcShipLocations);
        });
    }

    initGame();
});



