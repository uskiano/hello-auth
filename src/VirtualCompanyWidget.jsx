import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export default function VirtualCompanyWidget() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    // Daylight sky-ish background
    scene.background = new THREE.Color('#bfe7ff')

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200)
    camera.position.set(0, 1.6, 4.2)
    camera.lookAt(0, 1.0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // IBL environment for more realistic daylight-ish reflections
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture

    // "Sun" light
    const sun = new THREE.DirectionalLight(0xffffff, 2.3)
    sun.position.set(6, 10, 4)
    sun.castShadow = true
    sun.shadow.mapSize.width = 1024
    sun.shadow.mapSize.height = 1024
    sun.shadow.camera.near = 0.1
    sun.shadow.camera.far = 30
    sun.shadow.camera.left = -5
    sun.shadow.camera.right = 5
    sun.shadow.camera.top = 5
    sun.shadow.camera.bottom = -5
    scene.add(sun)

    // Sky fill
    const hemi = new THREE.HemisphereLight(0xdff3ff, 0xffffff, 0.9)
    scene.add(hemi)

    // Ground for shadows
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: '#e9eef3', roughness: 0.95, metalness: 0.0 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.001
    ground.receiveShadow = true
    scene.add(ground)

    // Subtle grid (optional)
    const grid = new THREE.GridHelper(20, 20, 0xaac4d4, 0xcfe2ee)
    grid.position.y = 0
    grid.material.opacity = 0.22
    grid.material.transparent = true
    scene.add(grid)

    // Group that rotates (our "virtual company")
    const company = new THREE.Group()
    company.position.y = 1.0
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

        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true
            obj.receiveShadow = true
          }
        })

        // Normalize scale
        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)
        const maxAxis = Math.max(size.x, size.y, size.z)
        const s = 1.9 / maxAxis
        model.scale.setScalar(s)

        // Center it and put base on ground (y=0)
        box.setFromObject(model)
        const center = new THREE.Vector3()
        box.getCenter(center)
        const min = new THREE.Vector3()
        box.getMin(min)

        model.position.sub(center)
        // shift so lowest point sits on y=0
        model.position.y -= min.y

        company.add(model)

        // Move logo above model top
        const topY = (size.y * s)
        sprite.position.set(0, topY + 0.35, 0)
      },
      undefined,
      () => {
        // Fallback: simple building
        const geom = new THREE.BoxGeometry(1, 1.5, 1)
        const mat = new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.45, metalness: 0.05 })
        model = new THREE.Mesh(geom, mat)
        model.castShadow = true
        model.receiveShadow = true
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
    function frameObject(obj3d) {
      const box = new THREE.Box3().setFromObject(obj3d)
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)

      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      let camZ = Math.abs((maxDim / 2) / Math.tan(fov / 2))
      camZ *= 1.3

      camera.position.set(center.x, center.y + maxDim * 0.25, camZ)
      camera.near = maxDim / 100
      camera.far = maxDim * 100
      camera.updateProjectionMatrix()
      camera.lookAt(center)
    }

    let framed = false
    function tick() {
      if (!framed && model) {
        framed = true
        frameObject(company)
      }
      company.rotation.y += 0.004
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
      pmrem.dispose()
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
