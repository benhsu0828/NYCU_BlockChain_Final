// Global variables
let web3;
let contract;
let currentAccount = null;
let currentGameId = null;
let eventSubscriptions = [];
let board; // Board instance

// Initialize application
async function init() {
    try {
        // Initialize Web3
        web3 = new Web3(RPC_URL);
        
        // Initialize contract instance
        contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
        
        // Load account list
        await loadAccounts();
        
        // Initialize game board
        board = new GomokuBoard('gameBoard');
        board.onCellClick = handleBoardClick;
        
        // Initialize chat room
        initChat();
        
        updateConnectionStatus(true);
        showToast("✓ Connected to blockchain node", "success");
        
        logEvent("System", "Application initialized");
        
        await updateGameCounter();
        await restoreGameSession();
        
    } catch (error) {
        console.error("Initialization failed:", error);
        updateConnectionStatus(false);
        showToast("✗ Connection failed: " + error.message, "error");
    }
}

// Load account list
async function loadAccounts() {
    try {
        const accounts = await web3.eth.getAccounts();
        const select = document.getElementById('accountSelect');
        select.innerHTML = '<option value="">Please select account...</option>';
        
        accounts.forEach((account, index) => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = `Account ${index + 1}: ${account}`;
            select.appendChild(option);
        });
        
        // Listen for account changes
        select.addEventListener('change', async (e) => {
            currentAccount = e.target.value;
            if (currentAccount) {
                document.getElementById('accountAddress').textContent = 
                    `Current Account: ${formatAddress(currentAccount)}`;
                
                localStorage.setItem('currentAccount', currentAccount);
                
                // Unlock account (try multiple passwords)
                try {
                    await web3.eth.personal.unlockAccount(currentAccount, "nycu", 0);
                    showToast(`✓ Account unlocked: ${formatAddress(currentAccount)}`, "success");
                } catch (error) {
                    try {
                        await web3.eth.personal.unlockAccount(currentAccount, "nycu2", 0);
                        showToast(`✓ Account unlocked: ${formatAddress(currentAccount)}`, "success");
                    } catch (error2) {
                        showToast("⚠ Failed to unlock account, please unlock manually in Geth console", "warning");
                    }
                }
                
                await checkAndLoadCurrentGame();
            }
        });
        
    } catch (error) {
        console.error("Failed to load accounts:", error);
        showToast("✗ Cannot load account list", "error");
    }
}

async function updateGameCounter() {
    try {
        const gameCounter = await contract.methods.gameCounter().call();
        document.getElementById('totalGames').textContent = gameCounter;
        logEvent("System", `Currently have ${gameCounter} games (ID: 0-${gameCounter - 1})`);
    } catch (error) {
        console.error("Cannot get game count:", error);
        document.getElementById('totalGames').textContent = "Error";
    }
}

// Create game
async function createGame() {
    if (!currentAccount) {
        showToast("Please select account first", "warning");
        return;
    }
    
    try {
        const betAmount = document.getElementById('betAmount').value || "0";
        
        showToast("⏳ Creating game...", "info");
        logEvent("System", `Creating game (Bet: ${betAmount} wei)`);
        
        const receipt = await contract.methods.createGame().send({
            from: currentAccount,
            value: betAmount,
            gas: 3000000
        });
        
        // Get game ID from event
        const gameId = receipt.events.GameCreated.returnValues.gameId;
        
        showToast(`✓ Game created successfully! Game ID: ${gameId}`, "success");
        logEvent("Game", `Game ${gameId} created`);
        
        await updateGameCounter();
        
        // Auto load new game
        document.getElementById('gameIdInput').value = gameId;
        await loadGame();
        
        showToast("⚠ Please remember to run mining command to confirm transaction", "warning");
        
    } catch (error) {
        console.error("Failed to create game:", error);
        showToast("✗ Failed to create game: " + error.message, "error");
        logEvent("Error", "Failed to create game: " + error.message);
    }
}

// Join game
async function joinGame() {
    if (!currentAccount) {
        showToast("Please select account first", "warning");
        return;
    }
    
    if (currentGameId === null) {
        showToast("Please load game first", "warning");
        return;
    }
    
    try {
        // First get game info to confirm bet amount
        const info = await contract.methods.getGameInfo(currentGameId).call();
        const betAmount = info.betAmount;
        
        showToast(`⏳ Joining game ${currentGameId}...`, "info");
        logEvent("System", `Joining game ${currentGameId} (Bet: ${betAmount} wei)`);
        
        await contract.methods.joinGame(currentGameId).send({
            from: currentAccount,
            value: betAmount,
            gas: 3000000
        });
        
        showToast(`✓ Successfully joined game ${currentGameId}`, "success");
        logEvent("Game", `Joined game ${currentGameId}`);
        
        // Reload game state
        await loadGame();
        
        showToast("⚠ Please remember to run mining command to confirm transaction", "warning");
        
    } catch (error) {
        console.error("Failed to join game:", error);
        showToast("✗ Failed to join game: " + error.message, "error");
        logEvent("Error", "Failed to join game: " + error.message);
    }
}

// Load game
async function loadGame() {
    const gameId = document.getElementById('gameIdInput').value;
    
    if (!gameId && gameId !== "0") {
        showToast("Please enter game ID", "warning");
        return;
    }
    
    try {
        currentGameId = parseInt(gameId);
        
        const gameCounter = await contract.methods.gameCounter().call();
        if (currentGameId >= parseInt(gameCounter)) {
            showToast(`✗ Game ${currentGameId} does not exist! Currently only have ${gameCounter} games (ID: 0-${gameCounter - 1})`, "error");
            logEvent("Error", `Game ${currentGameId} does not exist, gameCounter = ${gameCounter}`);
            return;
        }
        
        showToast(`⏳ Loading game ${currentGameId}...`, "info");
        
        // Get game info
        const info = await contract.methods.getGameInfo(currentGameId).call();
        
        console.log('Game info:', info);
        
        // Update game info display
        document.getElementById('gameState').textContent = GameState[info.state];
        document.getElementById('currentTurn').textContent = 
            info.currentPlayer == 1 ? "Black (First)" : "White (Second)";
        document.getElementById('blackPlayer').textContent = formatAddress(info.blackPlayer);
        document.getElementById('whitePlayer').textContent = 
            info.whitePlayer === "0x0000000000000000000000000000000000000000" 
                ? "Waiting..." 
                : formatAddress(info.whitePlayer);
        document.getElementById('betAmountDisplay').textContent = `${info.betAmount} wei`;
        document.getElementById('moveCount').textContent = info.moveCount;
        
        await loadBoardState(currentGameId);
        
        // Save game ID to localStorage
        localStorage.setItem('currentGameId', currentGameId);
        
        showToast(`✓ Game ${currentGameId} loaded successfully`, "success");
        logEvent("System", `Game ${currentGameId} loaded`);
        
        // Subscribe to events
        subscribeToEvents();
        
        // Load chat history
        loadChatHistory();
        
    } catch (error) {
        console.error("Failed to load game:", error);
        showToast("✗ Failed to load game: " + error.message, "error");
        logEvent("Error", "Failed to load game: " + error.message);
    }
}

async function loadBoardState(gameId) {
    try {
        console.log('📥 Loading board state for game', gameId);
        
        board.clear();
        
        // Contract uses board[row][col]; getPiece(_x, _y) means _x=row, _y=col
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                try {
                    // Call contract: getPiece(gameId, row, col)
                    const cellValue = await contract.methods.getPiece(gameId, row, col).call();
                    const piece = parseInt(cellValue);
                    
                    if (piece !== 0) {
                        // Contract [row][col] corresponds to UI (col, row)
                        // UI uses x as column and y as row; contract uses _x=row, _y=col
                        console.log(`📍 Contract[${row}][${col}] = ${piece} -> UI(${col}, ${row})`);
                        board.placePiece(col, row, piece);
                    }
                } catch (err) {
                    console.warn(`Failed to get cell (${row}, ${col}):`, err.message);
                }
            }
        }
        
        console.log('✅ Board state loaded');
        
    } catch (error) {
        console.error('Failed to load board state:', error);
    }
}

// Board click handler
async function handleBoardClick(x, y) {
    console.log(`🖱️ Board clicked at: x=${x}, y=${y}`);
    await makeMove(x, y);
}

    // Make move (triggered from board click)
async function makeMove(x, y) {
    if (!currentAccount || currentGameId === null) {
        showToast("Please load game first", "warning");
        return;
    }

    try {
        // Pre-flight checks
        showToast(`⏳ Checking game state...`, "info");
        
        const gameInfo = await contract.methods.getGameInfo(currentGameId).call();
        
        const blackPlayer = gameInfo.blackPlayer.toLowerCase();
        const whitePlayer = gameInfo.whitePlayer.toLowerCase();
        const currentTurn = parseInt(gameInfo.currentPlayer);
        const gameState = parseInt(gameInfo.state);
        const myAccount = currentAccount.toLowerCase();
        
        // Check game state
        const stateNames = ["Waiting", "Playing", "Black Won", "White Won", "Draw"];
        if (gameState !== 1) {
            showToast(`✗ Game is not in playing state! State: ${stateNames[gameState]}`, "error");
            return;
        }
        
        // Determine which player I am
        let myColor;
        let myColorName;
        if (myAccount === blackPlayer) {
            myColor = 1;
            myColorName = "Black";
        } else if (myAccount === whitePlayer) {
            myColor = 2;
            myColorName = "White";
        } else {
            showToast(`✗ You are not a player in this game!`, "error");
            logEvent("Error", `Your account: ${myAccount}`);
            logEvent("Error", `Black: ${blackPlayer}`);
            logEvent("Error", `White: ${whitePlayer}`);
            return;
        }
        
        logEvent("Game", `You are ${myColorName}, attempting to place at (${x}, ${y})`);
        
        // Check if it's my turn
        if (currentTurn !== myColor) {
            const waitingFor = currentTurn === 1 ? "Black" : "White";
            const waitingAddress = currentTurn === 1 ? blackPlayer : whitePlayer;
            showToast(`⚠ Not your turn yet! Now is ${waitingFor}'s turn`, "warning");
            logEvent("Game", `Waiting for ${waitingFor} (${waitingAddress}) to move...`);
            return;
        }
        
        // Check if position is empty
        const piece = await contract.methods.getPiece(currentGameId, x, y).call();
        if (parseInt(piece) !== 0) {
            const pieceNames = ["Empty", "Black piece", "White piece"];
            showToast(`✗ Position (${x}, ${y}) already has ${pieceNames[parseInt(piece)]}!`, "warning");
            return;
        }

        showToast(`⏳ Making ${myColorName} move (${x}, ${y})...`, "info");
        
        // Swap x and y when sending to contract because contract treats _x as row and _y as col
        console.log(`🔄 Coordinate transformation: UI(${x}, ${y}) -> Contract(${y}, ${x})`);
        logEvent("Transaction", `Sending makeMove: gameId=${currentGameId}, contract_x=${y}, contract_y=${x} (UI coords: ${x},${y})`);

        const receipt = await contract.methods.makeMove(currentGameId, y, x).send({
            from: currentAccount,
            gas: 500000
        });

        console.log("Transaction receipt:", receipt);

        showToast(`✓ Move successful! Position: (${x}, ${y})`, "success");
        logEvent("Game", `Successfully placed ${myColorName} piece at (${x}, ${y})`);
        
        // Local update board (immediate feedback)
        board.placePiece(x, y, myColor);
        
        showToast("⚠ Please run mining command to confirm transaction", "warning");

    } catch (error) {
        console.error("Move failed:", error);
        
        let errorMsg = "Unknown error";
        if (error.message) {
            const msg = error.message.toLowerCase();
            if (msg.includes("not your turn")) {
                errorMsg = "Not your turn yet!";
                errorDetails = "Please wait for opponent to finish their turn";
            } else if (msg.includes("position already occupied") || msg.includes("position occupied")) {
                errorMsg = `Position (${x}, ${y}) is occupied!`;
                errorDetails = "Please choose another empty position";
            } else if (msg.includes("game is not in playing state")) {
                errorMsg = "Game is not in playing state";
                errorDetails = "Please check game state";
            } else if (msg.includes("invalid coordinates")) {
                errorMsg = `Coordinates (${x}, ${y}) invalid!`;
                errorDetails = "Coordinates should be 0-14";
            } else if (msg.includes("not a player")) {
                errorMsg = "You are not a player in this game";
                errorDetails = "Please confirm you joined the correct game";
            } else if (msg.includes("user denied")) {
                errorMsg = "Transaction rejected";
                errorDetails = "You cancelled the transaction signature";
            } else if (msg.includes("insufficient funds")) {
                errorMsg = "Insufficient balance";
                errorDetails = "Please ensure account has enough ETH for gas";
            } else if (msg.includes("reverted")) {
                errorMsg = "Transaction reverted";
                errorDetails = "Possible reasons: not your turn, position occupied, or game ended";
            } else {
                errorMsg = error.message;
            }
        }
        
        showToast(`✗ Move failed: ${errorMsg}`, "error");
        if (errorDetails) {
            showToast(`💡 ${errorDetails}`, "info");
        }
        
        logEvent("Error", `Move failed: ${errorMsg}`);
        logEvent("Error", `Coordinates: (${x}, ${y})`);
        logEvent("Error", `Details: ${error.message}`);
        
        // Output complete error to console for debugging
        console.group("❌ Move failed details");
        console.log("Coordinates:", x, y);
        console.log("Game ID:", currentGameId);
        console.log("Account:", currentAccount);
        console.log("Error message:", error.message);
        console.log("Error object:", error);
        console.groupEnd();
    }
}

// Surrender
async function surrender() {
    if (!currentAccount) {
        showToast("Please select account first", "warning");
        return;
    }
    
    if (currentGameId === null) {
        showToast("Please load game first", "warning");
        return;
    }
    
    if (!confirm("Are you sure you want to surrender?")) {
        return;
    }
    
    try {
        showToast("⏳ Surrendering...", "info");
        logEvent("Game", "Player surrendered");
        
        await contract.methods.surrender(currentGameId).send({
            from: currentAccount,
            gas: 3000000
        });
        
        showToast("✓ Surrendered", "success");
        logEvent("Game", "Surrender successful");
        
        showToast("⚠ Please remember to run mining command to confirm transaction", "warning");
        
    } catch (error) {
        console.error("Failed to surrender:", error);
        showToast("✗ Failed to surrender: " + error.message, "error");
        logEvent("Error", "Failed to surrender: " + error.message);
    }
}

// Subscribe to events
function subscribeToEvents() {
    // Clear old subscriptions
    eventSubscriptions.forEach(sub => sub.unsubscribe());
    eventSubscriptions = [];
    
    if (currentGameId === null) return;
    
    // Subscribe to MoveMade event
    const moveSub = contract.events.MoveMade({
        filter: { gameId: currentGameId },
        fromBlock: 'latest'
    })
    .on('data', async (event) => {
        const { x, y, piece, player } = event.returnValues;
        
        // Coordinate transformation
        const uiX = parseInt(y);  // Contract y -> UI x
        const uiY = parseInt(x);  // Contract x -> UI y
        
        console.log(`📡 MoveMade transformation: Contract(${x}, ${y}) -> UI(${uiX}, ${uiY})`);
        logEvent("Move", `Player ${formatAddress(player)} placed at (${uiX}, ${uiY})`);
        
        // Reload game state
        await loadGame();
    })
    .on('error', console.error);
    
    eventSubscriptions.push(moveSub);
    
    // Subscribe to GameEnded event
    const endSub = contract.events.GameEnded({
        filter: { gameId: currentGameId },
        fromBlock: 'latest'
    })
    .on('data', (event) => {
        const { state, winner } = event.returnValues;
        const stateNames = ["Waiting", "Playing", "Black Won", "White Won", "Draw"];
        logEvent("Game Ended", `Result: ${stateNames[state]}, Winner: ${formatAddress(winner)}`);
        showToast(`🎉 Game ended! ${stateNames[state]}`, "success");
    })
    .on('error', console.error);
    
    eventSubscriptions.push(endSub);
    
    // Subscribe to PlayerJoined event
    const joinSub = contract.events.PlayerJoined({
        filter: { gameId: currentGameId },
        fromBlock: 'latest'
    })
    .on('data', async (event) => {
        const { player } = event.returnValues;
        logEvent("Player Joined", `Player ${formatAddress(player)} joined game`);
        showToast(`✓ Player joined game`, "success");
        
        // Reload game state
        await loadGame();
    })
    .on('error', console.error);
    
    eventSubscriptions.push(joinSub);
}

// Utility function: Format address
function formatAddress(address) {
    if (!address || address === "0x0000000000000000000000000000000000000000") {
        return "-";
    }
    return `${address.substring(0, 6)}...${address.substring(38)}`;
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.textContent = "Connected";
        statusEl.className = "status-connected";
    } else {
        statusEl.textContent = "Disconnected";
        statusEl.className = "status-disconnected";
    }
}

// Show toast message
function showToast(message, type = "info") {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Log event
function logEvent(category, message) {
    const eventLog = document.getElementById('eventLog');
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'event-entry';
    entry.innerHTML = `
        <span class="event-time">[${time}]</span>
        <span class="event-category">[${category}]</span>
        <span class="event-message">${message}</span>
    `;
    eventLog.insertBefore(entry, eventLog.firstChild);
    
    // Limit log count
    while (eventLog.children.length > 50) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Copy mining command
function copyMiningCommand() {
    const command = "miner.start(1); admin.sleep(3); miner.stop()";
    navigator.clipboard.writeText(command).then(() => {
        showToast("✓ Mining command copied", "success");
    }).catch(() => {
        showToast("✗ Copy failed", "error");
    });
}

// Listen to move events
function startEventListeners() {
    console.log('Starting event listeners...');
    
    // Listen to MoveMade event
    contract.events.MoveMade({
        fromBlock: 'latest'
    })
    .on('data', async (event) => {
        console.log('📡 MoveMade event:', event.returnValues);
        
        const { gameId, x, y, piece } = event.returnValues;
        
        // Contract x,y in events are row,col; convert to UI col,row
        const uiX = parseInt(y);  // Contract y (col) -> UI x
        const uiY = parseInt(x);  // Contract x (row) -> UI y
        
        console.log(`🔄 Event transformation: Contract(x=${x}, y=${y}) -> UI(${uiX}, ${uiY})`);
        
        if (parseInt(gameId) === currentGameId) {
            board.placePiece(uiX, uiY, parseInt(piece));
            await loadGame();
        }
        
        addEventLog(`Move: Game ${gameId}, Position (${uiX}, ${uiY}), ${piece === '1' ? 'Black' : 'White'} piece`);
    })
    .on('error', console.error);
    
    // ... other event listeners remain unchanged
}

async function restoreGameSession() {
    try {
        // Restore account from localStorage
        const savedAccount = localStorage.getItem('currentAccount');
        if (savedAccount) {
            const accounts = await web3.eth.getAccounts();
            if (accounts.includes(savedAccount)) {
                document.getElementById('accountSelect').value = savedAccount;
                currentAccount = savedAccount;
                document.getElementById('accountAddress').textContent = 
                    `Current Account: ${formatAddress(currentAccount)}`;
                
                // Auto check and load game
                await checkAndLoadCurrentGame();
            }
        }
        
        // Restore game ID from localStorage
        const savedGameId = localStorage.getItem('currentGameId');
        if (savedGameId && currentAccount) {
            document.getElementById('gameIdInput').value = savedGameId;
            showToast(`✓ Restored previous game session (Game ${savedGameId})`, "info");
        }
        
    } catch (error) {
        console.error('Failed to restore session:', error);
    }
}

async function checkAndLoadCurrentGame() {
    if (!currentAccount) return;
    
    try {
        // Check if player is in a game
        const gameId = await contract.methods.playerGame(currentAccount).call();
        
        if (gameId !== "0") {
            // Get game info
            const gameInfo = await contract.methods.getGameInfo(gameId).call();
            const stateNames = ["Waiting for opponent", "Playing", "Black won", "White won", "Draw"];
            const stateName = stateNames[parseInt(gameInfo.state)];
            
            // If game is still in progress
            if (parseInt(gameInfo.state) === 0 || parseInt(gameInfo.state) === 1) {
                showToast(`✓ Detected you are in game ${gameId} (${stateName})`, "success");
                
                // Auto fill game ID
                document.getElementById('gameIdInput').value = gameId;
                
                // Ask whether to load
                const shouldLoad = confirm(`You are in game ${gameId} (${stateName}), load this game?`);
                if (shouldLoad) {
                    await loadGame();
                }
            } else {
                showToast(`Previous game ${gameId} ended (${stateName})`, "info");
            }
        } else {
            showToast("You are not currently in any game", "info");
        }
        
    } catch (error) {
        console.error('Failed to check game:', error);
    }
}

async function improvedLoadGame() {
    const gameId = document.getElementById('gameIdInput').value;
    
    if (!gameId && gameId !== "0") {
        showToast("Please enter a Game ID", "warning");
        return;
    }
    
    try {
        currentGameId = parseInt(gameId);
        
        showToast(`⏳ Loading game ${currentGameId}...`, "info");
        
        // Fetch game information
        const info = await contract.methods.getGameInfo(currentGameId).call();
        
        // Update game info display
        document.getElementById('gameState').textContent = GameState[info.state];
        document.getElementById('currentTurn').textContent = 
            info.currentPlayer == 1 ? "Black (Goes First)" : "White (Goes Second)";
        document.getElementById('blackPlayer').textContent = formatAddress(info.blackPlayer);
        document.getElementById('whitePlayer').textContent = 
            info.whitePlayer === "0x0000000000000000000000000000000000000000" 
                ? "Waiting..." 
                : formatAddress(info.whitePlayer);
        document.getElementById('betAmountDisplay').textContent = `${info.betAmount} wei`;
        document.getElementById('moveCount').textContent = info.moveCount;
        
        // Fetch board state
        const boardData = await contract.methods.getBoard(currentGameId).call();
        board.updateBoard(boardData);
        
        localStorage.setItem('currentGameId', currentGameId);
        
        showToast(`✓ Game ${currentGameId} loaded successfully`, "success");
        logEvent("System", `Loaded game ${currentGameId}`);
        
        // Subscribe to events
        subscribeToEvents();
        
        // Load chat history
        loadChatHistory();
        
    } catch (error) {
        console.error("Failed to load game:", error);
        showToast("✗ Failed to load game: " + error.message, "error");
        logEvent("Error", "Failed to load game: " + error.message);
    }
}

// Initialize on page load
window.addEventListener('load', init);