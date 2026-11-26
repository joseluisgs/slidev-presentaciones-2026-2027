#!/usr/bin/env node
// tools/cerrar-ud.mjs — P3: un comando cierra una UD
//   1) validador estático (validar.mjs)  2) auditoría visual --temas both
//   3) export PDF claro + oscuro  4) informe final
//
// Uso: node tools/cerrar-ud.mjs --md PROG/UDXX.md [--url http://localhost:3030]
//        [--sin-auditoria] [--sin-export] [--umbral 25]
// exit 0 = todo OK · exit 1 = hay fallos · exit 2 = error de entorno
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(__dir, '..')
const argv = process.argv.slice(2)
const opt = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d
}
const flag = (k) => argv.includes(k)

const MD = opt('--md', null)
const URL_ = opt('--url', null)
const UMBRAL = opt('--umbral', '25')
const SIN_AUD = flag('--sin-auditoria')
const SIN_EXP = flag('--sin-export')
if (!MD) {
  console.error('Uso: node tools/cerrar-ud.mjs --md PROG/UDXX.md [--url http://localhost:PORT]')
  process.exit(2)
}
if (!fs.existsSync(path.resolve(RAIZ, MD))) {
  console.error(`ERROR: no existe ${MD}`)
  process.exit(2)
}
if (!SIN_AUD && !URL_) {
  console.error('ERROR: falta --url (el dev debe estar corriendo; léelo de su salida)')
  process.exit(2)
}

const paso = (titulo) => console.log(`\n########## ${titulo} ##########`)
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: RAIZ, stdio: 'inherit', shell: process.platform === 'win32' })
  return r.status ?? 1
}

// ---------- 1. estático ----------
paso('PASO 1/3 · validador estático')
if (run(process.execPath, [path.join(__dir, 'validar.mjs'), '--md', MD]) !== 0) {
  console.error('\nSTOP: validador estático con fallos — arréglalos antes de auditar.')
  process.exit(1)
}
if (SIN_AUD && SIN_EXP) {
  console.log('\ncerrar-ud: solo estático (—sin-auditoria —sin-export). OK')
  process.exit(0)
}

// ---------- 2. auditoría visual ----------
if (!SIN_AUD) {
  paso('PASO 2/3 · auditoría visual (--temas both)')
  const rc = run(process.execPath, [
    path.join(__dir, 'visual-check.mjs'),
    '--md', MD,
    '--url', URL_,
    '--temas', 'light',
    '--umbral', UMBRAL,
  ])
  if (rc !== 0) {
    console.error('\nSTOP: la auditoría tiene fallos — míralos en tools/out/capturas antes de exportar.')
    process.exit(rc)
  }
} else {
  paso('PASO 2/3 · auditoría visual OMITIDA (--sin-auditoria)')
}

// ---------- 3. export PDFs ----------
if (!SIN_EXP) {
  paso('PASO 3/3 · export PDF claro + oscuro')
  const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'))
  const mdNorm = MD.replace(/\\/g, '/')
  const claro = Object.entries(pkg.scripts || {}).find(
    ([k, v]) => k.startsWith('export:') && !k.endsWith(':dark') && String(v).includes(mdNorm)
  )
  if (!claro) {
    console.error(`ERROR: no hay script "export:*" que apunte a ${MD} en package.json`)
    process.exit(2)
  }
  const [claveClaro] = claro
  const claveOscuro = claveClaro + ':dark'
  if (!pkg.scripts[claveOscuro]) {
    console.error(`ERROR: falta el script "${claveOscuro}" en package.json`)
    process.exit(2)
  }
  if (run('npm', ['run', claveClaro]) !== 0) process.exit(1)
  if (run('npm', ['run', claveOscuro]) !== 0) process.exit(1)
} else {
  paso('PASO 3/3 · export OMITIDO (--sin-export)')
}

console.log(`\n=== CERRADA: ${MD} — estático OK · auditoría ${SIN_AUD ? 'omitida' : '0 fallos ×2'} · PDFs ${SIN_EXP ? 'omitidos' : 'exportados'} ===`)
process.exit(0)
