// 產生圖示對照表（只打包用到的圖示）
import { writeFileSync } from 'node:fs'
const names = `radar user-search phone-call bot bug fish drama key-round hammer door-open bell-ring terminal puzzle usb bug-play network siren database-backup lock-keyhole banknote send
mouse-pointer-click monitor-off copy handshake share-2 heart-handshake thumbs-up key waves hourglass globe eye-off users database-zap file-text cloud key-square user-x package-plus message-square-warning
graduation-cap wrench smartphone brick-wall mail-warning user-plus calendar-clock scissors eye ghost factory rocket hospital school
shield-check shield-x shield-alert shield-off zap lock lock-open skull snowflake volume-2 volume-x settings circle-question-mark crosshair activity building-2 x check chevron-right info rotate-ccw play trophy sparkles flame clock layers arrow-right fast-forward history user-round triangle-alert circle-alert hard-drive server database cpu recycle mail scan-eye lightbulb book-open list-checks flag target swords crown hand-coins hourglass timer menu pause shuffle hand scan download server-crash scroll-text eraser waypoints package-search coffee piggy-bank`.split(/\s+/).filter(Boolean)
const uniq = [...new Set(names)]
const pascal = (n) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
let out = '// 自動產生：node scripts/gen-icons.mjs\nimport type { Component } from \'vue\'\nimport {\n'
for (const n of uniq) out += `  ${pascal(n)} as I_${pascal(n)},\n`
out += "} from 'lucide-vue-next'\n\nexport const ICONS: Record<string, Component> = {\n"
for (const n of uniq) out += `  '${n}': I_${pascal(n)},\n`
out += '}\n'
writeFileSync('src/components/icons.ts', out)
console.log('icons:', uniq.length)
