class Example extends Phaser.Scene {
    constructor() {
        super();
        this.maintourist = null;
        this.touristFrame = null;
        this.cursors = null;
        this.defaultSpeed = 0.65; // Increased tourist speed by 30%
        this.defaultScale = 0.15 * (2 / 3) * 2;
        this.maxScale = this.defaultScale * 2.5;
        this.minScale = this.defaultScale * (1 / 2.5);
        this.baseFlashInterval = 2750;
        this.flashTimer = null;
        this.flashCircle = null;
        this.shouldFlash = false;
        this.elephants = [];
        this.elephantFrames = [];
        this.flashRadius = 0;
        this.elephantsZapped = 0;
        this.scoreText = null;
        this.healthText = null;
        this.instructionText = null;
        this.controlsText = null;
        this.health = 200;
        this.gameOver = false;
        this.elephantspeed = 0.65; // Increased elephant speed by 30%
        this.worldSize = null;
        this.scaleRate = 0.00625;
    }

    preload() {
        this.load.image('tourist', 'https://play.rosebud.ai/assets/tourist.png?5H72');
        this.load.image('background', 'https://play.rosebud.ai/assets/create a cartoon style bustling African village map.png?n46i');
        this.load.image('elephant', 'https://play.rosebud.ai/assets/elephant.png?T2vz');
    }

    create() {
        this.worldSize = {
            width: window.innerWidth * 4, // Reduced by 50%
            height: window.innerHeight * 4 // Reduced by 50%
        };

        this.matter.world.setBounds(0, 0, this.worldSize.width, this.worldSize.height, 32, true, true, true, true);

        this.add.image(this.worldSize.width / 2, this.worldSize.height / 2, 'background').setDisplaySize(this.worldSize.width, this.worldSize.height); // Resized the background

        this.maintourist = this._addtourist(this.worldSize.width / 2, this.worldSize.height / 2);
        const maintouristFrameColor = 0x0000FF;
        this.touristFrame = this.add.graphics({
            fillStyle: {
                color: maintouristFrameColor
            }
        });

        const screenLength = Math.max(this.cameras.main.width, this.cameras.main.height);
        const safeDistance = screenLength;

        for (let i = 0; i < 7; i++) {
            this._spawnelephant(safeDistance);
        }

        this.flashCircle = this.add.graphics();
        this.flashCircle.fillStyle(0x00FF00, 0.5);
        this.flashCircle.visible = false;

        this.cameras.main.setBounds(0, 0, this.worldSize.width, this.worldSize.height);
        this.cameras.main.startFollow(this.maintourist, true);
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
        let speed = this.defaultSpeed / this.maintourist.scaleX;
        let scaleRate = this.scaleRate;

        this._updatetourist(this.maintourist, speed, scaleRate, this.touristFrame);

        this.updateFlashTimer();

        if (this.flashCircle) {
            this.flashCircle.clear();
            if (this.shouldFlash) {
                this.flashCircle.fillStyle(0x00FF00, 0.5);
                this.flashRadius = this.maintourist.displayWidth * 1.15;
                this.flashCircle.fillCircle(this.maintourist.x, this.maintourist.y, this.flashRadius);
                this._checkelephantsOverlap(this.worldSize);
            }
            this.flashCircle.visible = this.shouldFlash;
        }

        for (let i = 0; i < this.elephants.length; i++) {
            const elephant = this.elephants[i];
            const elephantFrame = this.elephantFrames[i];
            elephantFrame.clear();
            elephantFrame.lineStyle(2, 0xFF0000);
            elephantFrame.strokeRect(elephant.x - elephant.displayWidth / 2, elephant.y - elephant.displayHeight / 2, elephant.displayWidth, elephant.displayHeight);

            this._moveelephant(elephant);
            this._checkelephantTouchingtourist(elephant);
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
        this.scoreText.setText('LEVEL / SCORE: ' + this.elephantsZapped);
        if (this.health <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.endGame();
        }
    }

    _addtourist(x, y) {
        let tourist = this.matter.add.image(x, y, 'tourist');
        tourist.setDisplaySize(this.cameras.main.width * this.defaultScale, this.cameras.main.height * this.defaultScale);
        tourist.setIgnoreGravity(true);
        tourist.setScale(this.defaultScale);
        return tourist;
    }

    _addelephant(x, y) {
        let elephant = this.matter.add.image(x, y, 'elephant');
        elephant.setDisplaySize(this.cameras.main.width * (this.defaultScale / 1.52), this.cameras.main.height * (this.defaultScale / 1.52));
        elephant.setIgnoreGravity(true);
        elephant.setScale(this.defaultScale / 1);
        return elephant;
    }

    _updatetourist(tourist, speed, scaleRate, frame) {
        if (this.cursors.left.isDown) {
            tourist.x -= speed;
        } else if (this.cursors.right.isDown) {
            tourist.x += speed;
        }

        if (this.cursors.up.isDown) {
            tourist.y -= speed;
        } else if (this.cursors.down.isDown) {
            tourist.y += speed;
        }

        if (this.shiftKey.isDown && tourist.scaleX < this.maxScale) {
            tourist.setScale(tourist.scaleX + scaleRate);
        }

        if (this.ctrlKey.isDown && tourist.scaleX > this.minScale) {
            tourist.setScale(tourist.scaleX - scaleRate);
        }

        frame.clear();
        frame.lineStyle(5, frame.defaultFillColor);
        frame.strokeRect(tourist.x - tourist.displayWidth / 2, tourist.y - tourist.displayHeight / 2, tourist.displayWidth, tourist.displayHeight);
    }

    _isWithinSafeDistance(x, y, centerX, centerY, safeDistance) {
        const distanceFromCenter = Phaser.Math.Distance.Between(x, y, centerX, centerY);
        return distanceFromCenter < safeDistance;
    }

    _checkelephantsOverlap(worldSize) {
        const flashCircleX = this.maintourist.x;
        const flashCircleY = this.maintourist.y;
        const flashCircleRadius = this.flashRadius;
        const safeDistance = Math.max(this.cameras.main.width, this.cameras.main.height);

        for (let i = 0; i < this.elephants.length; i++) {
            const elephant = this.elephants[i];
            const elephantRect = new Phaser.Geom.Rectangle(elephant.x - elephant.displayWidth / 2, elephant.y - elephant.displayHeight / 2, elephant.displayWidth, elephant.displayHeight);

            if (Phaser.Geom.Intersects.CircleToRectangle(new Phaser.Geom.Circle(flashCircleX, flashCircleY, flashCircleRadius), elephantRect)) {
                this._respawnelephant(worldSize, safeDistance, i);
                this.elephantsZapped++;
                this.elephantspeed += 0.05;
            }
        }
    }

    _checkelephantTouchingtourist(elephant) {
        const touristRect = new Phaser.Geom.Rectangle(
            this.maintourist.x - this.maintourist.displayWidth / 2,
            this.maintourist.y - this.maintourist.displayHeight / 2,
            this.maintourist.displayWidth,
            this.maintourist.displayHeight
        );
        const elephantRect = new Phaser.Geom.Rectangle(
            elephant.x - elephant.displayWidth / 2,
            elephant.y - elephant.displayHeight / 2,
            elephant.displayWidth,
            elephant.displayHeight
        );
        if (Phaser.Geom.Intersects.RectangleToRectangle(touristRect, elephantRect)) {
            this.health--;
        }
    }

    _moveelephant(elephant) {
        const distanceTotourist = Phaser.Math.Distance.Between(elephant.x, elephant.y, this.maintourist.x, this.maintourist.y);
        const angleTotourist = Phaser.Math.Angle.Between(elephant.x, elephant.y, this.maintourist.x, this.maintourist.y);

        const velocityX = Math.cos(angleTotourist) * this.elephantspeed;
        const velocityY = Math.sin(angleTotourist) * this.elephantspeed;

        elephant.x += velocityX;
        elephant.y += velocityY;
    }

    _spawnelephant(safeDistance) {
        let x, y;
        do {
            x = Phaser.Math.RND.between(this.worldSize.width * 0.1, this.worldSize.width * 0.9);
            y = Phaser.Math.RND.between(this.worldSize.height * 0.1, this.worldSize.height * 0.9);
        } while (this._isWithinSafeDistance(x, y, this.maintourist.x, this.maintourist.y, safeDistance));

        let elephant = this._addelephant(x, y);
        this.elephants.push(elephant);

        let elephantFrame = this.add.graphics();
        elephantFrame.lineStyle(2, 0xFF0000);
        elephantFrame.strokeRect(elephant.x - elephant.displayWidth / 2, elephant.y - elephant.displayHeight / 2, elephant.displayWidth, elephant.displayHeight);
        this.elephantFrames.push(elephantFrame);
    }

    _respawnelephant(worldSize, safeDistance, index) {
        const elephant = this.elephants[index];
        const elephantFrame = this.elephantFrames[index];

        elephant.destroy();
        elephantFrame.destroy();
        this.elephants.splice(index, 1);
        this.elephantFrames.splice(index, 1);

        this._spawnelephant(safeDistance);
    }

    calculateFlashInterval(tourist) {
        const flashInterval = this.baseFlashInterval;
        return flashInterval;
    }

    startFlashTimer() {
        this.flashTimer = this.time.addEvent({
            delay: this.calculateFlashInterval(this.maintourist),
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
        this.flashTimer.delay = this.calculateFlashInterval(this.maintourist);
    }
    endGame() {
        this.gameOver = true;
        // Dim the screen
        const dimScreen = this.add.graphics();
        dimScreen.fillStyle(0x000000, 0.75);
        dimScreen.fillRect(this.cameras.main.scrollX, this.cameras.main.scrollY, this.cameras.main.width, this.cameras.main.height);
        // Display final score
        const finalScoreText = this.add.text(this.cameras.main.scrollX + this.cameras.main.width / 2, this.cameras.main.scrollY + this.cameras.main.height / 2 - 50, `Final Score: ${this.elephantsZapped}`, {
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