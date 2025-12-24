# Blockchain Gomoku Web Interface

This is a blockchain-based Gomoku game web interface that visualizes the board, provides real-time chat, and interacts with smart contracts.

## Features

✨ **Complete Game Interface**
- 15x15 visual board with mouse click support for placing pieces
- Piece placement preview effect
- Real-time game state updates

💬 **Chat Room Functionality**
- On-chain chat messages
- Real-time message reception
- Display chat history

📊 **Game Information Display**
- Current game state
- Player information
- Move count statistics

📜 **Event Listening**
- Automatically listens to blockchain events
- Real-time game state updates
- Detailed event logs

## File Structure

```
web-ui/
├── index.html      # Main page
├── style.css       # Stylesheet
├── config.js       # Contract configuration and ABI
├── app.js          # Main application logic
├── board.js        # Board rendering
├── chat.js         # Chat room functionality
└── README.md       # Documentation
```

## Usage Instructions

### 1. Ensure Geth Node is Running

```bash
# Start Docker container
docker start <container_id>

# Enter container
docker exec -it <container_id> /bin/sh

# Start Geth
geth --datadir ./ --networkid 11330023 --http --http.addr 0.0.0.0 --http.port 8545 --http.api eth,web3,net,personal --http.corsdomain "*" --http.vhosts "*" --allow-insecure-unlock console
```

### 2. Unlock Accounts

In Geth console:

```javascript
personal.unlockAccount(eth.accounts[0], "nycu", 0)
personal.unlockAccount(eth.accounts[1], "nycu2", 0)
```

### 3. Start Web Interface

#### Method A: Using Python Simple Server

```bash
cd web-ui
python3 -m http.server 8000
```

Then open in browser: `http://localhost:8000`

#### Method B: Using Node.js http-server

```bash
npm install -g http-server
cd web-ui
http-server -p 8000 --cors
```

#### Method C: Open Directly in Browser

```bash
open index.html
```

**Note**: Opening directly may encounter CORS issues, it's recommended to use an HTTP server.

### 4. Using the Interface

1. **Select Account**: Choose player account from dropdown menu
2. **Create Game**: Enter bet amount (can be 0), click "Create Game"
3. **Run Mining**: Execute mining command in Geth console to confirm transaction
   ```javascript
   miner.start(1); admin.sleep(3); miner.stop()
   ```
4. **Join Game**: Another player enters game ID, clicks "Join Game"
5. **Start Playing**: Click on board intersections to place pieces
6. **Chat Interaction**: Enter messages in chat room to communicate with opponent

## Mining Command Quick Reference

After sending each transaction, execute in Geth console:

```javascript
miner.start(1); admin.sleep(3); miner.stop()
```

Or use the "Copy Command" button on the interface.

## Common Issues

### Q1: Cannot connect to blockchain node

**A**: Check:
- Is Geth running
- Is HTTP RPC enabled (\`--http\` parameter)
- Is CORS configured correctly (\`--http.corsdomain "*"\`)
- Is firewall blocking port 8545

### Q2: No response after sending transaction

**A**: Must execute mining command to package transaction:
```javascript
miner.start(1); admin.sleep(3); miner.stop()
```

### Q3: Account not unlocked

**A**: Unlock account in Geth console:
```javascript
personal.unlockAccount(eth.accounts[0], "nycu", 0)
```

### Q4: "Not your turn" error when placing piece

**A**: 
- Confirm it's your turn
- Check if previous transaction has been confirmed by mining
- Reload game state

### Q5: Chat messages not displaying

**A**: 
- Check if event listening is normal
- Confirm chat transaction has been mined
- Try reloading the game

## Technical Details

### Technologies Used

- **Web3.js**: Interact with Ethereum blockchain
- **HTML5 Canvas**: Draw board and pieces
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern UI design

### Contract Interaction

All contract methods are called through Web3.js:

```javascript
// Create game
await contract.methods.createGame().send({
    from: currentAccount,
    value: betAmount,
    gas: 3000000
});

// Make move
await contract.methods.makeMove(gameId, x, y).send({
    from: currentAccount,
    gas: 3000000
});

// Send chat
await contract.methods.sendChat(gameId, message).send({
    from: currentAccount,
    gas: 3000000
});
```

### Event Listening

Automatically listens to the following events:
- \`MoveMade\`: Player makes move
- \`GameEnded\`: Game ends
- \`PlayerJoined\`: Player joins
- \`ChatSent\`: Chat message

## Custom Configuration

Edit \`config.js\` to modify:

```javascript
// RPC node address
const RPC_URL = "http://localhost:8545";

// Contract address
const CONTRACT_ADDRESS = "0xYourContractAddress";

// Account addresses
const ACCOUNTS = {
    player1: "0xAddress1",
    player2: "0xAddress2"
};
```

## Development Suggestions

### Debug Mode

In browser Console you can view:
- All transaction details
- Event listening status
- Error messages

### Extended Features

Features that can be added:
- Undo functionality
- Game replay
- Win rate statistics
- Leaderboard
- More chat emojis

## License

MIT License

## Contact Information

For issues, please refer to the main project README or consult the Solidity contract documentation.
