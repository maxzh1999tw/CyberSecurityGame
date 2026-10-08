<script setup lang="ts">
// 節點的角色插圖（手繪向量風格，統一 120x120 畫布）
defineProps<{ role: string }>()
</script>

<template>
  <svg viewBox="0 0 120 120" class="art" aria-hidden="true">
    <defs>
      <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd9b8" />
        <stop offset="1" stop-color="#eab58a" />
      </linearGradient>
      <linearGradient id="metalG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5a6f92" />
        <stop offset="1" stop-color="#2a3752" />
      </linearGradient>
      <linearGradient id="screenG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4af3ff" />
        <stop offset="1" stop-color="#1b86d8" />
      </linearGradient>
      <linearGradient id="dbG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#1e8a78" />
        <stop offset="0.45" stop-color="#53f0cd" />
        <stop offset="1" stop-color="#1a7a6c" />
      </linearGradient>
    </defs>

    <!-- 業務小美 -->
    <g v-if="role === 'sales'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#ff6f86" />
      <path d="M44 88 L60 106 L76 88 Z" fill="#fff1f3" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M36 58 C34 30 48 20 62 20 C78 20 88 32 84 58 L84 84 C80 88 74 84 74 78 L74 52 C66 48 52 46 46 38 C44 46 44 54 46 58 L46 78 C46 84 40 88 36 84 Z" fill="#4a2a3e" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 50 C44 30 56 28 62 30 C74 32 80 40 80 50 C74 42 66 40 58 40 C50 40 44 44 40 50 Z" fill="#4a2a3e" />
      <circle cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M53 68 Q60 74 67 68" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <path d="M38 52 C38 40 46 34 60 34 C74 34 82 40 82 52" fill="none" stroke="#1c2233" stroke-width="3.2" stroke-linecap="round" />
      <rect x="33" y="50" width="7" height="14" rx="3.5" fill="#1c2233" />
      <path d="M36 62 C36 74 44 78 52 76" fill="none" stroke="#1c2233" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="53" cy="76" r="2.8" fill="#38d6ff" />
    </g>

    <!-- 工程師阿明 -->
    <g v-else-if="role === 'engineer'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#3f6fe8" />
      <path d="M40 90 Q60 112 80 90 L76 88 Q60 100 44 88 Z" fill="#2c52b8" />
      <path d="M52 100 L52 124 M68 100 L68 124" stroke="#9fc0ff" stroke-width="2" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C36 30 48 22 62 22 C76 22 86 32 82 50 C78 40 70 36 60 38 C50 36 42 40 38 50 Z" fill="#20212e" />
      <path d="M42 34 L50 26 L54 34 Z" fill="#20212e" />
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <rect x="43" y="52" width="17" height="13" rx="5" fill="rgba(160,220,255,.18)" stroke="#e8eefc" stroke-width="2.4" />
      <rect x="60" y="52" width="17" height="13" rx="5" fill="rgba(160,220,255,.18)" stroke="#e8eefc" stroke-width="2.4" />
      <path d="M59 58 L61 58" stroke="#e8eefc" stroke-width="2.4" />
      <path d="M54 69 Q60 73 66 69" fill="none" stroke="#a9604a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="76" y="92" width="22" height="16" rx="3" fill="#1b2438" stroke="#38d6ff" stroke-width="1.6" />
      <path d="M81 98 L85 101 L81 104 M89 104 L94 104" fill="none" stroke="#38d6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- 主管 -->
    <g v-else-if="role === 'boss'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#2b3550" />
      <path d="M44 88 L60 110 L76 88 L70 86 L60 96 L50 86 Z" fill="#f4f6fb" />
      <path d="M57 96 L63 96 L66 124 L54 124 Z" fill="#d23a4e" />
      <path d="M57 96 L63 96 L61.5 102 L58.5 102 Z" fill="#a62a3c" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 52 C38 36 46 30 60 30 C74 30 82 36 81 52 C78 44 74 42 70 40 C64 44 54 44 50 40 C46 42 42 46 39 52 Z" fill="#aeb6c6" />
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 Q52 49 57 52 M63 52 Q68 49 74 52" fill="none" stroke="#7d8696" stroke-width="2.4" stroke-linecap="round" />
      <path d="M53 70 Q60 74 67 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M96 100 l8 -8 l8 8 l-8 8 Z" fill="#ffd36b" stroke="#b78b22" stroke-width="1.4" />
    </g>

    <!-- IT 管理員 -->
    <g v-else-if="role === 'it'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#1f7f62" />
      <path d="M40 90 Q60 114 80 90 Q80 84 60 84 Q40 84 40 90 Z" fill="#14594a" />
      <path d="M36 84 C36 104 84 104 84 84" fill="none" stroke="#10121c" stroke-width="5" stroke-linecap="round" />
      <rect x="30" y="80" width="10" height="16" rx="5" fill="#10121c" />
      <rect x="80" y="80" width="10" height="16" rx="5" fill="#10121c" />
      <rect x="51" y="70" width="18" height="20" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M36 52 C34 30 48 20 62 20 C76 20 88 30 84 52 L80 50 C76 40 70 34 60 34 C50 34 44 40 40 50 Z" fill="#1c1c28" />
      <path d="M36 44 C40 34 46 30 54 28 L60 22" fill="none" stroke="#38d6ff" stroke-width="2" opacity="0.6" />
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="52" cy="58" r="8.5" fill="none" stroke="#2cf5a0" stroke-width="2.2" />
      <circle cx="68" cy="58" r="8.5" fill="none" stroke="#2cf5a0" stroke-width="2.2" />
      <path d="M60.5 57 L59.5 57" stroke="#2cf5a0" stroke-width="2.2" />
      <path d="M55 69 L65 69" stroke="#8a4a3a" stroke-width="2.6" stroke-linecap="round" />
      <g transform="translate(86 96)">
        <circle r="7" fill="none" stroke="#ffd36b" stroke-width="2.4" />
        <path d="M7 0 L20 0 M14 0 L14 5 M19 0 L19 4" stroke="#ffd36b" stroke-width="2.4" stroke-linecap="round" />
      </g>
    </g>

    <!-- 新人 -->
    <g v-else-if="role === 'newhire'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#ff9442" />
      <path d="M44 88 L60 102 L76 88 Z" fill="#fff4e6" />
      <path d="M48 90 L48 112 M72 90 L72 112" stroke="#2a3347" stroke-width="3" />
      <rect x="38" y="108" width="24" height="16" rx="3" fill="#ffe14a" stroke="#c9a400" stroke-width="1.4" />
      <text x="50" y="119.5" text-anchor="middle" font-size="8.5" font-weight="900" fill="#7a5a00" font-family="Orbitron, sans-serif">NEW</text>
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 52 C34 32 44 20 60 20 C76 20 86 32 82 52 C80 42 74 36 66 38 C60 30 50 32 44 38 C40 42 38 46 38 52 Z" fill="#7a4a2a" />
      <circle cx="52" cy="58" r="3" fill="#1a1a24" />
      <circle cx="68" cy="58" r="3" fill="#1a1a24" />
      <circle cx="53" cy="57" r="1" fill="#fff" />
      <circle cx="69" cy="57" r="1" fill="#fff" />
      <path d="M52 66 Q60 76 68 66 Z" fill="#fff" stroke="#b5475c" stroke-width="2" stroke-linejoin="round" />
      <path d="M96 22 l3 8 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 Z" fill="#ffd36b" opacity="0.9" />
    </g>

    <!-- AI 助理 -->
    <g v-else-if="role === 'ai'">
      <path d="M22 124 C22 100 40 92 60 92 C80 92 98 100 98 124 Z" fill="url(#metalG)" />
      <rect x="54" y="82" width="12" height="14" fill="#3a4a68" />
      <path d="M60 20 L60 10" stroke="#8fa8d0" stroke-width="3" stroke-linecap="round" />
      <circle cx="60" cy="9" r="4.5" fill="#e070ff" />
      <circle cx="60" cy="9" r="8" fill="#e070ff" opacity="0.25" />
      <rect x="26" y="24" width="68" height="60" rx="18" fill="url(#metalG)" stroke="#8fa8d0" stroke-width="1.6" />
      <rect x="33" y="34" width="54" height="38" rx="12" fill="#0a1020" />
      <rect x="40" y="46" width="14" height="12" rx="5" fill="url(#screenG)" />
      <rect x="66" y="46" width="14" height="12" rx="5" fill="url(#screenG)" />
      <circle cx="44" cy="50" r="2" fill="#fff" opacity="0.9" />
      <circle cx="70" cy="50" r="2" fill="#fff" opacity="0.9" />
      <path d="M46 65 Q60 71 74 65" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" />
      <rect x="16" y="44" width="8" height="22" rx="4" fill="#5a6f92" />
      <rect x="96" y="44" width="8" height="22" rx="4" fill="#5a6f92" />
      <circle cx="60" cy="104" r="4" fill="#38d6ff" opacity="0.8" />
    </g>

    <!-- 基礎設施（伺服器機櫃） -->
    <g v-else-if="role === 'infra'">
      <rect x="26" y="12" width="68" height="100" rx="6" fill="#1a2438" stroke="#5a7ab0" stroke-width="2" />
      <g v-for="i in 4" :key="i">
        <rect x="32" :y="18 + (i - 1) * 23" width="56" height="19" rx="3" fill="url(#metalG)" stroke="#7d93b8" stroke-width="1" />
        <circle cx="40" :cy="27.5 + (i - 1) * 23" r="2.6" :fill="i % 2 ? '#2cf5a0' : '#38d6ff'" />
        <circle cx="48" :cy="27.5 + (i - 1) * 23" r="2.6" :fill="i === 3 ? '#ffb02e' : '#2cf5a0'" />
        <rect x="60" :y="24 + (i - 1) * 23" width="22" height="3" rx="1.5" fill="#0a1020" />
        <rect x="60" :y="29.5 + (i - 1) * 23" width="14" height="3" rx="1.5" fill="#0a1020" />
      </g>
      <path d="M94 96 C104 96 106 104 106 112 L106 124 M26 96 C16 96 14 104 14 112 L14 124" fill="none" stroke="#38d6ff" stroke-width="3" stroke-linecap="round" />
      <rect x="32" y="108" width="56" height="3" rx="1.5" fill="#38d6ff" opacity="0.5" />
    </g>

    <!-- 資料庫 -->
    <g v-else-if="role === 'db'">
      <ellipse cx="60" cy="96" rx="34" ry="12" fill="#12554a" />
      <rect x="26" y="70" width="68" height="26" fill="url(#dbG)" />
      <ellipse cx="60" cy="70" rx="34" ry="12" fill="#6ff7dc" />
      <ellipse cx="60" cy="68" rx="34" ry="12" fill="#2bc9a8" />
      <ellipse cx="60" cy="68" rx="26" ry="8" fill="none" stroke="#bffcee" stroke-width="1.4" opacity="0.7" />
      <ellipse cx="60" cy="74" rx="34" ry="12" fill="none" stroke="#0e5c50" stroke-width="2" />
      <rect x="26" y="44" width="68" height="26" fill="url(#dbG)" />
      <ellipse cx="60" cy="44" rx="34" ry="12" fill="#6ff7dc" />
      <ellipse cx="60" cy="42" rx="34" ry="12" fill="#2bc9a8" />
      <ellipse cx="60" cy="42" rx="26" ry="8" fill="none" stroke="#bffcee" stroke-width="1.4" opacity="0.7" />
      <ellipse cx="60" cy="48" rx="34" ry="12" fill="none" stroke="#0e5c50" stroke-width="2" />
      <rect x="26" y="20" width="68" height="24" fill="url(#dbG)" />
      <ellipse cx="60" cy="20" rx="34" ry="12" fill="#a6fbea" />
      <ellipse cx="60" cy="18" rx="34" ry="12" fill="#4af0cb" />
      <circle cx="40" cy="58" r="2.6" fill="#0a3a32" />
      <circle cx="40" cy="84" r="2.6" fill="#0a3a32" />
      <circle cx="40" cy="32" r="2.6" fill="#0a3a32" />
      <path d="M52 30 l8 -6 l8 6 M60 24 v14" fill="none" stroke="#0a3a32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
    </g>

    <!-- 備份 -->
    <g v-else-if="role === 'backup'">
      <rect x="22" y="30" width="76" height="62" rx="9" fill="url(#metalG)" stroke="#8fa8d0" stroke-width="2" />
      <rect x="30" y="38" width="60" height="30" rx="4" fill="#0a1020" />
      <circle cx="60" cy="53" r="9" fill="none" stroke="#38d6ff" stroke-width="3" />
      <path d="M60 48 V53 L64 56" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M60 36 A17 17 0 1 1 43 53" fill="none" stroke="#2cf5a0" stroke-width="3" stroke-linecap="round" />
      <path d="M38 50 L43 57 L48 50 Z" fill="#2cf5a0" />
      <rect x="30" y="74" width="30" height="8" rx="2" fill="#1a2438" />
      <circle cx="82" cy="78" r="4" fill="#2cf5a0" />
      <path d="M36 100 H84 M44 108 H76" stroke="#5a7ab0" stroke-width="3" stroke-linecap="round" opacity="0.5" />
    </g>
  </svg>
</template>

<style scoped>
.art {
  width: 100%;
  height: 100%;
}
</style>
