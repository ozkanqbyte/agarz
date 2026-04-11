import * as PIXI from 'pixi.js'

const WORLD_SIZE = 6000

function hexColor(str) {
  if (!str) return 0x6366f1
  const h = str.replace('#', '')
  return parseInt(h.length === 3 ? h[0]+h[0]+h[1]+h[1]+h[2]+h[2] : h, 16)
}

function darkenHex(color, amt) {
  const r = Math.max(0, ((color >> 16) & 0xff) - amt)
  const g = Math.max(0, ((color >> 8) & 0xff) - amt)
  const b = Math.max(0, (color & 0xff) - amt)
  return (r << 16) | (g << 8) | b
}

export class PixiRenderer {
  constructor() {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x060612,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    })
    this.app.view.style.position = 'absolute'
    this.app.view.style.top = '0'
    this.app.view.style.left = '0'
    this.app.view.style.zIndex = '1'
    this.app.ticker.stop()

    this.world = new PIXI.Container()
    this.app.stage.addChild(this.world)

    this.bgLayer = new PIXI.Graphics()
    this.gridLayer = new PIXI.Graphics()
    this.foodLayer = new PIXI.Container()
    this.ejectedLayer = new PIXI.Container()
    this.virusLayer = new PIXI.Container()
    this.dyingLayer = new PIXI.Container()
    this.otherCellsLayer = new PIXI.Container()
    this.myCellsLayer = new PIXI.Container()
    this.particleLayer = new PIXI.Container()

    this.world.addChild(this.bgLayer)
    this.world.addChild(this.gridLayer)
    this.world.addChild(this.foodLayer)
    this.world.addChild(this.ejectedLayer)
    this.world.addChild(this.virusLayer)
    this.world.addChild(this.dyingLayer)
    this.world.addChild(this.otherCellsLayer)
    this.world.addChild(this.myCellsLayer)
    this.world.addChild(this.particleLayer)

    this._foodSprites = []
    this._foodTexture = this._createCircleTexture(8, 0xffffff)
    this._cellGfxMap = new Map()
    this._nameTextMap = new Map()
    this._virusGfxMap = new Map()
    this._ejectedGfxMap = new Map()
    this._dyingGfxMap = new Map()
    this._particleGfxPool = []

    this._gridDrawn = false
    this._bgColor = 0x060612

    window.addEventListener('resize', () => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight)
    })
  }

  getCanvas() {
    return this.app.view
  }

  _createCircleTexture(r, color) {
    const g = new PIXI.Graphics()
    g.beginFill(color)
    g.drawCircle(0, 0, r)
    g.endFill()
    return this.app.renderer.generateTexture(g)
  }

  _drawGridOnce(theme) {
    const g = this.gridLayer
    g.clear()
    const bgHex = hexColor(theme?.bg || '#060612')
    this.app.renderer.backgroundColor = bgHex
    this._bgColor = bgHex

    const gridColor = hexColor(theme?.grid || '#1e1b4b')
    g.lineStyle(1, gridColor, 0.35)
    const STEP = 100
    for (let x = 0; x <= WORLD_SIZE; x += STEP) {
      g.moveTo(x, 0); g.lineTo(x, WORLD_SIZE)
    }
    for (let y = 0; y <= WORLD_SIZE; y += STEP) {
      g.moveTo(0, y); g.lineTo(WORLD_SIZE, y)
    }
    const borderColor = hexColor(theme?.border || '#6366f1')
    g.lineStyle(4, borderColor, 0.85)
    g.drawRect(0, 0, WORLD_SIZE, WORLD_SIZE)
    this._gridDrawn = true
  }

  updateCamera(camera, W, H) {
    const z = camera.zoom
    this.world.x = W / 2 - camera.x * z
    this.world.y = H / 2 - camera.y * z
    this.world.scale.set(z)
  }

  _getFoodSprite(i) {
    if (i >= this._foodSprites.length) {
      while (this._foodSprites.length <= i) {
        const s = new PIXI.Sprite(this._foodTexture)
        s.anchor.set(0.5)
        this._foodSprites.push(s)
        this.foodLayer.addChild(s)
      }
    }
    return this._foodSprites[i]
  }

  renderFood(food) {
    const len = food.length
    for (let i = 0; i < len; i++) {
      const f = food[i]
      const s = this._getFoodSprite(i)
      s.visible = true
      s.x = f.x; s.y = f.y
      const r = f.r || 5
      s.scale.set(r / 8)
      s.tint = hexColor(f.color)
    }
    for (let i = len; i < this._foodSprites.length; i++) {
      this._foodSprites[i].visible = false
    }
  }

  _getCellGfx(id, layer) {
    if (!this._cellGfxMap.has(id)) {
      const c = new PIXI.Container()
      const g = new PIXI.Graphics()
      c.addChild(g)
      layer.addChild(c)
      this._cellGfxMap.set(id, { container: c, gfx: g })
    }
    return this._cellGfxMap.get(id)
  }

  _getNameText(id, layer) {
    if (!this._nameTextMap.has(id)) {
      const t = new PIXI.Text('', {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: 20,
        fontWeight: 'bold',
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 3,
        align: 'center',
      })
      t.anchor.set(0.5)
      layer.addChild(t)
      this._nameTextMap.set(id, t)
    }
    return this._nameTextMap.get(id)
  }

  _drawOneCell(gfx, container, x, y, r, colorHex, isMe, isSplit) {
    gfx.clear()
    const darker = darkenHex(colorHex, 40)
    gfx.lineStyle(Math.max(2, r * 0.04), darker, 0.9)
    gfx.beginFill(colorHex, 1)
    gfx.drawCircle(0, 0, r)
    gfx.endFill()

    gfx.lineStyle(0)
    gfx.beginFill(0xffffff, 0.18)
    gfx.drawCircle(-r * 0.25, -r * 0.3, r * 0.32)
    gfx.endFill()

    if (isMe) {
      gfx.beginFill(0xffffff, 0.06)
      gfx.drawCircle(0, 0, r * 0.75)
      gfx.endFill()
    }

    container.x = x
    container.y = y
  }

  renderOtherPlayers(otherPlayers, camera, W, H) {
    const used = new Set()
    const viewL = camera.x - W / (2 * camera.zoom) - 200
    const viewR = camera.x + W / (2 * camera.zoom) + 200
    const viewT = camera.y - H / (2 * camera.zoom) - 200
    const viewB = camera.y + H / (2 * camera.zoom) + 200

    for (const [pid, op] of Object.entries(otherPlayers)) {
      const cells = op.cells || []
      for (let ci = 0; ci < cells.length; ci++) {
        const c = cells[ci]
        const cx = c._x || c.x || 0
        const cy = c._y || c.y || 0
        if (cx < viewL || cx > viewR || cy < viewT || cy > viewB) continue

        const id = `op_${pid}_${ci}`
        used.add(id)
        const r = Math.sqrt(Math.max(c.mass || 20, 1)) * 4.5
        const colorHex = hexColor(op.color)
        const { container, gfx } = this._getCellGfx(id, this.otherCellsLayer)
        this._drawOneCell(gfx, container, cx, cy, r, colorHex, false, false)

        const nameId = `name_op_${pid}_${ci}`
        used.add(nameId)
        if (r > 20) {
          const nt = this._getNameText(nameId, this.otherCellsLayer)
          nt.x = cx; nt.y = cy
          nt.text = op.name || ''
          nt.style.fontSize = Math.max(12, r * 0.38)
          nt.visible = true
        }
      }
    }

    for (const [id, { container }] of this._cellGfxMap) {
      if (id.startsWith('op_') && !used.has(id)) container.visible = false
      else if (id.startsWith('op_')) container.visible = true
    }
    for (const [id, t] of this._nameTextMap) {
      if (id.startsWith('name_op_') && !used.has(id)) t.visible = false
    }
  }

  renderMyCells(cells, color, name, isGod) {
    const colorHex = hexColor(color)
    const used = new Set()

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      const r = c.radius || Math.sqrt(Math.max(c.mass || 20, 1)) * 4.5
      const id = `me_${i}`
      used.add(id)
      const { container, gfx } = this._getCellGfx(id, this.myCellsLayer)
      this._drawOneCell(gfx, container, c.x, c.y, r, colorHex, true, false)
      container.visible = true

      if (r > 18) {
        const nameId = `name_me_${i}`
        used.add(nameId)
        const nt = this._getNameText(nameId, this.myCellsLayer)
        nt.x = c.x; nt.y = c.y
        nt.text = name || ''
        nt.style.fontSize = Math.max(12, r * 0.38)
        nt.visible = true
      }
    }

    for (const [id, { container }] of this._cellGfxMap) {
      if (id.startsWith('me_') && !used.has(id)) container.visible = false
    }
    for (const [id, t] of this._nameTextMap) {
      if (id.startsWith('name_me_') && !used.has(id)) t.visible = false
    }
  }

  renderViruses(viruses) {
    const used = new Set()
    for (const v of viruses) {
      const id = `virus_${v.id}`
      used.add(id)
      let g = this._virusGfxMap.get(id)
      if (!g) {
        g = new PIXI.Graphics()
        this.virusLayer.addChild(g)
        this._virusGfxMap.set(id, g)
      }
      g.visible = true
      g.clear()

      const r = Math.sqrt(Math.max(v.mass || 100, 1)) * 4.5
      const innerR = r * 0.72
      const spikes = 12
      const spikeRatio = 1.42

      const green = 0x22c55e
      const border = 0x16a34a

      g.lineStyle(2.5, border, 0.9)
      g.beginFill(green, 0.9)
      g.moveTo(v.x + r, v.y)
      for (let i = 1; i <= spikes * 2; i++) {
        const angle = (i / (spikes * 2)) * Math.PI * 2
        const rad = i % 2 === 0 ? r : r * spikeRatio
        g.lineTo(v.x + Math.cos(angle) * rad, v.y + Math.sin(angle) * rad)
      }
      g.closePath()
      g.endFill()

      g.lineStyle(0)
      g.beginFill(0x4ade80, 0.7)
      g.drawCircle(v.x, v.y, innerR)
      g.endFill()

      g.beginFill(0xffffff, 0.12)
      g.drawCircle(v.x - innerR * 0.28, v.y - innerR * 0.28, innerR * 0.22)
      g.endFill()
    }

    for (const [id, g] of this._virusGfxMap) {
      if (!used.has(id)) g.visible = false
    }
  }

  renderEjected(ejected) {
    const used = new Set()
    for (const em of ejected) {
      const id = `ej_${em.id}`
      used.add(id)
      let g = this._ejectedGfxMap.get(id)
      if (!g) {
        g = new PIXI.Graphics()
        this.ejectedLayer.addChild(g)
        this._ejectedGfxMap.set(id, g)
      }
      g.visible = true
      g.clear()
      const r = 6
      g.beginFill(hexColor(em.color), 0.9)
      g.lineStyle(1.5, 0xffffff, 0.3)
      g.drawCircle(em.x, em.y, r)
      g.endFill()
    }
    for (const [id, g] of this._ejectedGfxMap) {
      if (!used.has(id)) g.visible = false
    }
  }

  renderDyingCells(dying) {
    const used = new Set()
    for (let i = 0; i < dying.length; i++) {
      const d = dying[i]
      const id = `dying_${i}`
      used.add(id)
      let g = this._dyingGfxMap.get(id)
      if (!g) {
        g = new PIXI.Graphics()
        this.dyingLayer.addChild(g)
        this._dyingGfxMap.set(id, g)
      }
      g.visible = true
      g.clear()
      const alpha = Math.max(0, Math.min(1, d.life)) * 0.75
      g.beginFill(hexColor(d.color), alpha)
      g.drawCircle(d.x, d.y, Math.max(1, d.r))
      g.endFill()
    }
    for (const [id, g] of this._dyingGfxMap) {
      if (!used.has(id)) g.visible = false
    }
  }

  renderParticles(particles) {
    while (this._particleGfxPool.length < particles.length) {
      const g = new PIXI.Graphics()
      this.particleLayer.addChild(g)
      this._particleGfxPool.push(g)
    }
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const g = this._particleGfxPool[i]
      g.visible = true
      g.clear()
      const alpha = Math.min(1, p.life) * 0.85
      g.beginFill(hexColor(p.color), alpha)
      g.drawCircle(p.x, p.y, Math.max(0.5, p.r || 3))
      g.endFill()
    }
    for (let i = particles.length; i < this._particleGfxPool.length; i++) {
      this._particleGfxPool[i].visible = false
    }
  }

  render(engine) {
    const { camera, canvas, theme } = engine
    const W = canvas.width, H = canvas.height

    if (!this._gridDrawn || this._lastTheme !== theme) {
      this._drawGridOnce(theme)
      this._lastTheme = theme
    }

    this.updateCamera(camera, W, H)

    this.renderFood(engine.food || [])
    this.renderViruses(engine.viruses || [])
    this.renderEjected(engine.ejected || [])
    this.renderDyingCells(engine.dyingCells || [])
    this.renderOtherPlayers(engine.otherPlayers || {}, camera, W, H)
    this.renderMyCells(engine.cells || [], engine.playerColor || engine.color, engine.playerName, engine.isGod)
    this.renderParticles(engine.particles || [])

    this.app.renderer.render(this.app.stage)
  }

  destroy() {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }
}
