// 檢查程式裡用到的圖示名稱，是不是都有收進 src/components/icons.ts（沒收進去會顯示成問號）
//   node scripts/check-icons.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const lucide = await import('lucide-vue-next')
const pascal = (n) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
const isLucide = (n) => n.includes('-') ? pascal(n) in lucide : pascal(n) in lucide

const icons = readFileSync('src/components/icons.ts', 'utf8')
const have = new Set([...icons.matchAll(/^  '([a-z0-9-]+)':/gm)].map((m) => m[1]))

const files = []
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(vue|ts)$/.test(f) && f !== 'icons.ts') files.push(p)
  }
}
walk('src')

const missing = new Map()
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  for (const line of lines.filter((l) => /icon|Icon|name=/.test(l)))
  for (const m of line.matchAll(/['"]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)['"]/g)) {
    const n = m[1]
    if (have.has(n)) continue
    // 只看「真的是 lucide 圖示名稱」的字串（排除一般文字、class 名稱）
    if (isLucide(n) && n.length > 3) missing.set(n, (missing.get(n) ?? []).concat(f))
  }
}
if (!missing.size) console.log('圖示都齊全')
else for (const [n, fs] of missing) console.log('缺少圖示：', n, '←', [...new Set(fs)].join(', '))
