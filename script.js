class Example extends Phaser.Scene {
    constructor() {
        super();
        this.mainGorilla = null;
        this.gorillaFrame = null;
        this.cursors = null;
        this.defaultSpeed = 0.65; // Increased gorilla speed by 30%
        this.defaultScale = 0.15 * (2 / 3) * 2;
        this.maxScale = this.defaultScale * 2.5;
        this.minScale = this.defaultScale * (1 / 2.5);
        this.baseFlashInterval = 2750;
        this.flashTimer = null;
        this.flashCircle = null;
        this.shouldFlash = false;
        this.poachers = [];
        this.poacherFrames = [];
        this.flashRadius = 0;
        this.poachersZapped = 0;
        this.scoreText = null;
        this.healthText = null;
        this.instructionText = null;
        this.controlsText = null;
        this.health = 200;
        this.gameOver = false;
        this.poacherSpeed = 0.65; // Increased poacher speed by 30%
        this.worldSize = null;
        this.scaleRate = 0.00625;
    }

    preload() {
        this.load.image('gorilla', 'https://play.rosebud.ai/assets/tourist.png?5H72');
        this.load.image('background', 'https://play.rosebud.ai/assets/create a cartoon style bustling African village map.png?n46i');
        this.load.image('poacher', 'https://play.rosebud.ai/assets/elephant.png?T2vz');
    }

    create() {
        this.worldSize = {
            width: window.innerWidth * 4, // Reduced by 50%
            height: window.innerHeight * 4 // Reduced by 50%
        };

        this.matter.world.setBounds(0, 0, this.worldSize.width, this.worldSize.height, 32, true, true, true, true);

        this.add.image(this.worldSize.width / 2, this.worldSize.height / 2, 'background').setDisplaySize(this.worldSize.width, this.worldSize.height); // Resized the background

        this.mainGorilla = this._addGorilla(this.worldSize.width / 2, this.worldSize.height / 2);
        const mainGorillaFrameColor = 0x0000FF;
        this.gorillaFrame = this.add.graphics({
            fillStyle: {
                color: mainGorillaFrameColor
            }
        });

        const screenLength = Math.max(this.cameras.main.width, this.cameras.main.height);
        const safeDistance = screenLength;

        for (let i = 0; i < 7; i++) {
            this._spawnPoacher(safeDistance);
        }

        this.flashCircle = this.add.graphics();
        this.flashCircle.fillStyle(0x00FF00, 0.5);
        this.flashCircle.visible = false;

        this.cameras.main.setBounds(0, 0, this.worldSize.width, this.worldSize.height);
        this.cameras.main.startFollow(this.mainGorilla, true);
        this.cameras.main.setZoom(1);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A); // A key for growing
        this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z); // Z key for shrinking

        const cameraBottomY = this.cameras.main.scrollY + this.cameras.main.height;
        const cameraTopY = this.cameras.main.scrollY;
        const cameraLeftX = this.cameras.main.scrollX;
        const cameraMiddleX = this.cameras.main.scrollX + this.cameras.main.width / 2;

        this.instructionText = this.add.text(cameraLeftX + 16, cameraTopY + 16, 'AVOID THE ELEPHANTS!', {
            fontSize: '24px',
            fill: '#230680',
            font: 'bold 25px Arial'
        });
        this.instructionText.setOrigin(0, 0);

        this.controlsText = this.add.text(cameraLeftX + 16, cameraTopY + 48, 'Arrow Keys = Move\nA = Grow\nZ = Shrink\nGreen shield repels elephant', {
            fontSize: '19px',
            fill: '#230680',
           font: 'bold 25px Arial'
        });
        this.controlsText.setOrigin(0, 0);

        this.healthText = this.add.text(cameraMiddleX, cameraBottomY - 32, 'Health: 100', {
            fontSize: '25px',
             fill: '#230680',
             font: 'bold 25px Arial'
        });
        this.healthText.setOrigin(0.5, 1);

        this.scoreText = this.add.text(cameraMiddleX, cameraBottomY, 'Level / Score: 0', {
            fontSize: '25px',
             fill: '#230680',
            font: 'bold 25px Arial'
        });
        this.scoreText.setOrigin(0.5, 1);

        this.startFlashTimer();
    }

    update() {
        if (this.gameOver) return;
        let speed = this.defaultSpeed / this.mainGorilla.scaleX;
        let scaleRate = this.scaleRate;

        this._updateGorilla(this.mainGorilla, speed, scaleRate, this.gorillaFrame);

        this.updateFlashTimer();

        if (this.flashCircle) {
            this.flashCircle.clear();
            if (this.shouldFlash) {
                this.flashCircle.fillStyle(0x00FF00, 0.5);
                this.flashRadius = this.mainGorilla.displayWidth * 1.15;
                this.flashCircle.fillCircle(this.mainGorilla.x, this.mainGorilla.y, this.flashRadius);
                this._checkPoachersOverlap(this.worldSize);
            }
            this.flashCircle.visible = this.shouldFlash;
        }

        for (let i = 0; i < this.poachers.length; i++) {
            const poacher = this.poachers[i];
            const poacherFrame = this.poacherFrames[i];
            poacherFrame.clear();
            poacherFrame.lineStyle(2, 0xFF0000);
            poacherFrame.strokeRect(poacher.x - poacher.displayWidth / 2, poacher.y - poacher.displayHeight / 2, poacher.displayWidth, poacher.displayHeight);

            this._movePoacher(poacher);
            this._checkPoacherTouchingGorilla(poacher);
        }

        const cameraBottomY = this.cameras.main.scrollY + this.cameras.main.height;
        const cameraTopY = this.cameras.main.scrollY;
        const cameraLeftX = this.cameras.main.scrollX;
        const cameraMiddleX = this.cameras.main.scrollX + this.cameras.main.width / 2;

        this.instructionText.setPosition(cameraLeftX + 16, cameraTopY + 16);
        this.controlsText.setPosition(cameraLeftX + 16, cameraTopY + 48);
        this.healthText.setPosition(cameraMiddleX, cameraBottomY - 32);
        this.healthText.setText('Health: ' + this.health);
        this.scoreText.setPosition(cameraMiddleX, cameraBottomY);
        this.scoreText.setText('LEVEL / SCORE: ' + this.poachersZapped);
        if (this.health <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.endGame();
        }
    }

    _addGorilla(x, y) {
        let gorilla = this.matter.add.image(x, y, 'gorilla');
        gorilla.setDisplaySize(this.cameras.main.width * this.defaultScale, this.cameras.main.height * this.defaultScale);
        gorilla.setIgnoreGravity(true);
        gorilla.setScale(this.defaultScale);
        return gorilla;
    }

    _addPoacher(x, y) {
        let poacher = this.matter.add.image(x, y, 'poacher');
        poacher.setDisplaySize(this.cameras.main.width * (this.defaultScale / 1.52), this.cameras.main.height * (this.defaultScale / 1.52));
        poacher.setIgnoreGravity(true);
        poacher.setScale(this.defaultScale / 1);
        return poacher;
    }

    _updateGorilla(gorilla, speed, scaleRate, frame) {
        if (this.cursors.left.isDown) {
            gorilla.x -= speed;
        } else if (this.cursors.right.isDown) {
            gorilla.x += speed;
        }

        if (this.cursors.up.isDown) {
            gorilla.y -= speed;
        } else if (this.cursors.down.isDown) {
            gorilla.y += speed;
        }

        if (this.shiftKey.isDown && gorilla.scaleX < this.maxScale) {
            gorilla.setScale(gorilla.scaleX + scaleRate);
        }

        if (this.ctrlKey.isDown && gorilla.scaleX > this.minScale) {
            gorilla.setScale(gorilla.scaleX - scaleRate);
        }

        frame.clear();
        frame.lineStyle(5, frame.defaultFillColor);
        frame.strokeRect(gorilla.x - gorilla.displayWidth / 2, gorilla.y - gorilla.displayHeight / 2, gorilla.displayWidth, gorilla.displayHeight);
    }

    _isWithinSafeDistance(x, y, centerX, centerY, safeDistance) {
        const distanceFromCenter = Phaser.Math.Distance.Between(x, y, centerX, centerY);
        return distanceFromCenter < safeDistance;
    }

    _checkPoachersOverlap(worldSize) {
        const flashCircleX = this.mainGorilla.x;
        const flashCircleY = this.mainGorilla.y;
        const flashCircleRadius = this.flashRadius;
        const safeDistance = Math.max(this.cameras.main.width, this.cameras.main.height);

        for (let i = 0; i < this.poachers.length; i++) {
            const poacher = this.poachers[i];
            const poacherRect = new Phaser.Geom.Rectangle(poacher.x - poacher.displayWidth / 2, poacher.y - poacher.displayHeight / 2, poacher.displayWidth, poacher.displayHeight);

            if (Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(flashCircleX, flashCircleY, flashCircleRadius), poacherRect)) {
                this._respawnPoacher(worldSize, safeDistance, i);
                this.poachersZapped++;
                this.poacherSpeed += 0.05;
            }
        }
    }

    _checkPoacherTouchingGorilla(poacher) {
        const gorillaRect = new Phaser.Geom.Rectangle(
            this.mainGorilla.x - this.mainGorilla.displayWidth / 2,
            this.mainGorilla.y - this.mainGorilla.displayHeight / 2,
            this.mainGorilla.displayWidth,
            this.mainGorilla.displayHeight
        );
        const poacherRect = new Phaser.Geom.Rectangle(
            poacher.x - poacher.displayWidth / 2,
            poacher.y - poacher.displayHeight / 2,
            poacher.displayWidth,
            poacher.displayHeight
        );
        if (Phaser.Geom.Intersects.RectangleToRectangle(gorillaRect, poacherRect)) {
            this.health--;
        }
    }

    _movePoacher(poacher) {
        const distanceToGorilla = Phaser.Math.Distance.Between(poacher.x, poacher.y, this.mainGorilla.x, this.mainGorilla.y);
        const angleToGorilla = Phaser.Math.Angle.Between(poacher.x, poacher.y, this.mainGorilla.x, this.mainGorilla.y);

        const velocityX = Math.cos(angleToGorilla) * this.poacherSpeed;
        const velocityY = Math.sin(angleToGorilla) * this.poacherSpeed;

        poacher.x += velocityX;
        poacher.y += velocityY;
    }

    _spawnPoacher(safeDistance) {
        let x, y;
        do {
            x = Phaser.Math.RND.between(this.worldSize.width * 0.1, this.worldSize.width * 0.9);
            y = Phaser.Math.RND.between(this.worldSize.height * 0.1, this.worldSize.height * 0.9);
        } while (this._isWithinSafeDistance(x, y, this.mainGorilla.x, this.mainGorilla.y, safeDistance));

        let poacher = this._addPoacher(x, y);
        this.poachers.push(poacher);

        let poacherFrame = this.add.graphics();
        poacherFrame.lineStyle(2, 0xFF0000);
        poacherFrame.strokeRect(poacher.x - poacher.displayWidth / 2, poacher.y - poacher.displayHeight / 2, poacher.displayWidth, poacher.displayHeight);
        this.poacherFrames.push(poacherFrame);
    }

    _respawnPoacher(worldSize, safeDistance, index) {
        const poacher = this.poachers[index];
        const poacherFrame = this.poacherFrames[index];

        poacher.destroy();
        poacherFrame.destroy();
        this.poachers.splice(index, 1);
        this.poacherFrames.splice(index, 1);

        this._spawnPoacher(safeDistance);
    }

    calculateFlashInterval(gorilla) {
        const flashInterval = this.baseFlashInterval;
        return flashInterval;
    }

    startFlashTimer() {
        this.flashTimer = this.time.addEvent({
            delay: this.calculateFlashInterval(this.mainGorilla),
            callback: () => {
                this.shouldFlash = true;

                this.time.delayedCall(100, () => {
                    this.shouldFlash = false;
                });
            },
            callbackScope: this,
            loop: true
        });
    }

    updateFlashTimer() {
        this.flashTimer.delay = this.calculateFlashInterval(this.mainGorilla);
    }
    endGame() {
        this.gameOver = true;
        // Dim the screen
        const dimScreen = this.add.graphics();
        dimScreen.fillStyle(0x000000, 0.75);
        dimScreen.fillRect(this.cameras.main.scrollX, this.cameras.main.scrollY, this.cameras.main.width, this.cameras.main.height);
        // Display final score
        const finalScoreText = this.add.text(this.cameras.main.scrollX + this.cameras.main.width / 2, this.cameras.main.scrollY + this.cameras.main.height / 2 - 50, `Final Score: ${this.poachersZapped}`, {
            fontSize: '65px',
            fill: '#fff'
        });
        finalScoreText.setOrigin(0.5, 0.5);
        const restartText = this.add.text(this.cameras.main.scrollX + this.cameras.main.width / 2, this.cameras.main.scrollY + this.cameras.main.height / 2, "Refresh page to restart.", {
            fontSize: '30px',
            fill: '#fff'
        });
        restartText.setOrigin(0.5, 0.5);
    }
}
const config = {
    type: Phaser.AUTO,
    parent: 'renderDiv',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: Example,
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                y: 0
            }
        }
    }
};

window.phaserGame = new Phaser.Game(config);

window.addEventListener('resize', function(event) {
    window.phaserGame.scale.resize(window.innerWidth, window.innerHeight);
}, false);