import Phaser from 'phaser';

function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void
) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, size, size);
  if (!canvas) return;
  draw(canvas.getContext(), size);
  canvas.refresh();
}

function makeGraphicsTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

export function createTextures(scene: Phaser.Scene) {
  // Pixel blanc (barres de vie batchées, remplace les Rectangles)
  makeGraphicsTexture(scene, 'tex-white', 4, 4, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  });

  // Halo lumineux doux (dégradé radial)
  makeCanvasTexture(scene, 'tex-glow', 64, (ctx, size) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });

  // Petite particule douce
  makeCanvasTexture(scene, 'tex-particle', 16, (ctx, size) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });

  // Corps du joueur (cercle avec relief)
  makeCanvasTexture(scene, 'tex-player', 32, (ctx, size) => {
    const c = size / 2;
    const grad = ctx.createRadialGradient(c - 4, c - 4, 2, c, c, 14);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(150,150,150,1)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, 13, 0, Math.PI * 2);
    ctx.fill();
  });

  makeGraphicsTexture(scene, 'tex-ring', 36, 36, (g) => {
    g.lineStyle(2.5, 0xffffff, 1);
    g.strokeCircle(18, 18, 15);
  });

  makeGraphicsTexture(scene, 'tex-pointer', 16, 16, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(16, 8, 2, 2, 2, 14);
  });

  // Projectile (trait lumineux)
  makeCanvasTexture(scene, 'tex-bolt', 24, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, size / 2, size, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Orbe d'XP (losange brillant)
  makeGraphicsTexture(scene, 'tex-orb', 16, 16, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillPoints([
      new Phaser.Geom.Point(8, 1),
      new Phaser.Geom.Point(14, 8),
      new Phaser.Geom.Point(8, 15),
      new Phaser.Geom.Point(2, 8)
    ], true);
  });

  // Ennemis : une forme par type
  makeGraphicsTexture(scene, 'tex-enemy0', 32, 32, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(3, 3, 26, 26, 6);
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(11, 13, 3);
    g.fillCircle(21, 13, 3);
  });

  makeGraphicsTexture(scene, 'tex-enemy1', 24, 24, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(22, 12, 2, 2, 2, 22);
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(12, 12, 2.5);
  });

  makeGraphicsTexture(scene, 'tex-enemy2', 48, 48, (g) => {
    g.fillStyle(0xffffff, 1);
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      pts.push(new Phaser.Geom.Point(24 + Math.cos(a) * 22, 24 + Math.sin(a) * 22));
    }
    g.fillPoints(pts, true);
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(17, 20, 4);
    g.fillCircle(31, 20, 4);
  });

  makeGraphicsTexture(scene, 'tex-enemy3', 28, 28, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillPoints([
      new Phaser.Geom.Point(14, 1),
      new Phaser.Geom.Point(27, 14),
      new Phaser.Geom.Point(14, 27),
      new Phaser.Geom.Point(1, 14)
    ], true);
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(14, 14, 4);
  });

  // Sol : tuile 256x256 avec bruit et grille discrète (se répète sans couture)
  makeCanvasTexture(scene, 'tex-ground', 256, (ctx, size) => {
    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 220; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 1.8;
      const shade = Math.random();
      ctx.fillStyle = shade > 0.5
        ? `rgba(70, 80, 110, ${0.03 + Math.random() * 0.07})`
        : `rgba(20, 22, 30, ${0.15 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(90, 100, 140, 0.08)';
    ctx.lineWidth = 1;
    for (let p = 0; p <= size; p += 64) {
      ctx.beginPath();
      ctx.moveTo(p + 0.5, 0);
      ctx.lineTo(p + 0.5, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p + 0.5);
      ctx.lineTo(size, p + 0.5);
      ctx.stroke();
    }
  });

  // Vignette (assombrit les bords de l'écran)
  makeCanvasTexture(scene, 'tex-vignette', 512, (ctx, size) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  });
}
