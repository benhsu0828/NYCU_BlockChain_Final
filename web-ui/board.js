// Board Rendering Module
class GomokuBoard {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.boardSize = 15;
        this.cellSize = 40;
        this.padding = 30;
        
        // Set canvas dimensions
        this.canvas.width = this.cellSize * (this.boardSize - 1) + this.padding * 2;
        this.canvas.height = this.cellSize * (this.boardSize - 1) + this.padding * 2;
        
        // Using contract-compatible indexing: board[x][y]
        this.board = Array(15).fill(null).map(() => Array(15).fill(0));
        
        // Event Listeners
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        this.hoverPos = null;
        this.onCellClick = null; // Callback function for clicks
        
        this.draw();
    }
    
    // Render the board
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid lines
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < this.boardSize; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(this.padding + i * this.cellSize, this.padding);
            ctx.lineTo(this.padding + i * this.cellSize, this.padding + (this.boardSize - 1) * this.cellSize);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(this.padding, this.padding + i * this.cellSize);
            ctx.lineTo(this.padding + (this.boardSize - 1) * this.cellSize, this.padding + i * this.cellSize);
            ctx.stroke();
        }
        
        // Draw Star Points (Tengen and the four corner stars)
        const stars = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];
        ctx.fillStyle = '#000';
        stars.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(
                this.padding + x * this.cellSize,
                this.padding + y * this.cellSize,
                4, 0, Math.PI * 2
            );
            ctx.fill();
        });
        
        // Draw coordinate labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // X-axis labels (0-14)
        for (let i = 0; i < this.boardSize; i++) {
            ctx.fillText(i, this.padding + i * this.cellSize, this.padding - 15);
            ctx.fillText(i, this.padding + i * this.cellSize, this.canvas.height - this.padding + 15);
        }
        
        // Y-axis labels (0-14)
        ctx.textAlign = 'right';
        for (let i = 0; i < this.boardSize; i++) {
            ctx.fillText(i, this.padding - 15, this.padding + i * this.cellSize);
            ctx.fillText(i, this.canvas.width - this.padding + 15, this.padding + i * this.cellSize);
        }
        
        // Draw pieces
        for (let x = 0; x < this.boardSize; x++) {
            for (let y = 0; y < this.boardSize; y++) {
                if (this.board[x][y] !== 0) {
                    this.drawPiece(x, y, this.board[x][y]);
                }
            }
        }
        
        // Draw hover preview
        if (this.hoverPos) {
            this.drawHoverPiece(this.hoverPos.x, this.hoverPos.y);
        }
    }
    
    // Draw a single piece
    drawPiece(x, y, color) {
        const ctx = this.ctx;
        const centerX = this.padding + x * this.cellSize;
        const centerY = this.padding + y * this.cellSize;
        const radius = this.cellSize * 0.4;
        
        // Draw piece shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw piece body
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        if (color === 1) {
            // Black piece - gradient effect
            const gradient = ctx.createRadialGradient(
                centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1,
                centerX, centerY, radius
            );
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
            ctx.fillStyle = gradient;
        } else {
            // White piece - gradient effect
            const gradient = ctx.createRadialGradient(
                centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1,
                centerX, centerY, radius
            );
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
            ctx.fillStyle = gradient;
        }
        
        ctx.fill();
        ctx.shadowColor = 'transparent';
        
        // Draw piece border
        ctx.strokeStyle = color === 1 ? '#000' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw hover preview piece
    drawHoverPiece(x, y, color) {
        const ctx = this.ctx;
        const centerX = this.padding + x * this.cellSize;
        const centerY = this.padding + y * this.cellSize;
        const radius = this.cellSize * 0.4;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = color === 1 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.strokeStyle = color === 1 ? '#000' : '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Handle mouse movement
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const x = Math.round((mouseX - this.padding) / this.cellSize);
        const y = Math.round((mouseY - this.padding) / this.cellSize);
        
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            if (!this.hoverPos || this.hoverPos.x !== x || this.hoverPos.y !== y) {
                this.hoverPos = { x, y };
                this.draw();
            }
        } else {
            if (this.hoverPos) {
                this.hoverPos = null;
                this.draw();
            }
        }
    }
    
    // Handle mouse leaving canvas
    handleMouseLeave() {
        this.hoverPos = null;
        this.draw();
    }
    
    // Handle click events
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const x = Math.round((mouseX - this.padding) / this.cellSize);
        const y = Math.round((mouseY - this.padding) / this.cellSize);
        
        console.log(`🎯 Click position: canvas(${mouseX.toFixed(1)}, ${mouseY.toFixed(1)}) -> grid(${x}, ${y})`);
        console.log(`📋 Board state at [${x}][${y}]:`, this.board[x][y]);
        
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            if (this.board[x][y] === 0 && this.onCellClick) {
                this.onCellClick(x, y);
            } else if (this.board[x][y] !== 0) {
                console.log(`⚠️ Position (${x}, ${y}) is occupied with piece ${this.board[x][y]}`);
            }
        }
    }
    
    // Update board state from external data
    updateBoard(boardData) {
        console.log('📥 Updating board with data:', boardData);
        
        // Clear the local board first
        this.board = Array(15).fill(null).map(() => Array(15).fill(0));
        
        // Copy directly from contract data (frontend now uses board[x][y] consistently)
        if (Array.isArray(boardData) && boardData.length === 15) {
            console.log('🔄 Syncing contract board[x][y] to display board[x][y]');
            for (let x = 0; x < 15; x++) {
                if (Array.isArray(boardData[x]) && boardData[x].length === 15) {
                    for (let y = 0; y < 15; y++) {
                        // Ensure data type conversion
                        const value = boardData[x][y];
                        const piece = parseInt(value) || 0;
                        if (piece !== 0) {
                            console.log(`  Contract[${x}][${y}] = ${piece} -> Display[${x}][${y}]`);
                        }
                        this.board[x][y] = piece;
                    }
                }
            }
        }
        
        console.log('✅ Board update complete:', this.board);
        this.draw();
    }
    
    // Reset the board
    clear() {
        this.board = Array(15).fill(null).map(() => Array(15).fill(0));
        this.draw();
    }
    
    // Place a piece manually (used for local preview)
    placePiece(x, y, color) {
        console.log(`🎨 Placing piece: (${x}, ${y}) = ${color} (${color === 1 ? 'Black' : 'White'})`);
        if (x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize) {
            this.board[x][y] = color;
            console.log(`  Stored at board[${x}][${y}]`);
            this.draw();
        } else {
            console.error(`❌ Invalid position: (${x}, ${y})`);
        }
    }
}