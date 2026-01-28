import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default function VirtualCompanyWidget() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0b1020')

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(2.8, 1.8, 2.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(5, 8, 5)
    scene.add(dir)

    const grid = new THREE.GridHelper(10, 10, 0x223355, 0x172033)
    grid.position.y = -0.01
    scene.add(grid)

    // Group that rotates (our "virtual company")
    const company = new THREE.Group()
    scene.add(company)

    // Logo sprite (canvas texture) floating above
    const logoCanvas = document.createElement('canvas')
    logoCanvas.width = 512
    logoCanvas.height = 256
    const ctx = logoCanvas.getContext('2d')
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, logoCanvas.width, logoCanvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 96px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('JUAN', logoCanvas.width / 2, logoCanvas.height / 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 6
    ctx.strokeText('JUAN', logoCanvas.width / 2, logoCanvas.height / 2)

    const logoTex = new THREE.CanvasTexture(logoCanvas)
    logoTex.anisotropy = 4
    const spriteMat = new THREE.SpriteMaterial({ map: logoTex, transparent: true })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(1.8, 0.9, 1)
    sprite.position.set(0, 1.8, 0)
    company.add(sprite)

    // Load model (free sample from threejs examples)
    const loader = new GLTFLoader()
    let model = null

    loader.load(
      '/models/littlest_tokyo.glb',
      (gltf) => {
        model = gltf.scene
        // Normalize scale
        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)
        const maxAxis = Math.max(size.x, size.y, size.z)
        const s = 1.8 / maxAxis
        model.scale.setScalar(s)

        // Center it
        box.setFromObject(model)
        const center = new THREE.Vector3()
        box.getCenter(center)
        model.position.sub(center)

        company.add(model)
      },
      undefined,
      () => {
        // Fallback: simple building
        const geom = new THREE.BoxGeometry(1, 1.5, 1)
        const mat = new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.6, metalness: 0.1 })
        model = new THREE.Mesh(geom, mat)
        model.position.y = 0.75
        company.add(model)
      }
    )

    function resize() {
      const w = mount.clientWidth || 400
      const h = mount.clientHeight || 240
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    let raf = 0
    function tick() {
      company.rotation.y += 0.006
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.dispose()
      spriteMat.dispose()
      logoTex.dispose()
      if (model) {
        model.traverse?.((obj) => {
          if (obj.geometry) obj.geometry.dispose?.()
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            mats.forEach((m) => {
              m.map?.dispose?.()
              m.dispose?.()
            })
          }
        })
      }
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div style={{ height: 260, borderRadius: 12, overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
