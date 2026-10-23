<script setup lang="ts">
// 節點的頭像（手繪向量風格，統一 120x120 畫布）
// art：各公司專屬的頭像；沒有專屬頭像的節點直接傳角色名稱
defineProps<{ art: string }>()
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
    <g v-if="art === 'sales'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#ff6f86" />
      <path d="M44 88 L60 106 L76 88 Z" fill="#fff1f3" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M36 58 C34 30 48 20 62 20 C78 20 88 32 84 58 L84 84 C80 88 74 84 74 78 L74 52 C66 48 52 46 46 38 C44 46 44 54 46 58 L46 78 C46 84 40 88 36 84 Z" fill="#4a2a3e" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 50 C44 30 56 28 62 30 C74 32 80 40 80 50 C74 42 66 40 58 40 C50 40 44 44 40 50 Z" fill="#4a2a3e" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M53 68 Q60 74 67 68" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <path d="M38 52 C38 40 46 34 60 34 C74 34 82 40 82 52" fill="none" stroke="#1c2233" stroke-width="3.2" stroke-linecap="round" />
      <rect x="33" y="50" width="7" height="14" rx="3.5" fill="#1c2233" />
      <path d="M36 62 C36 74 44 78 52 76" fill="none" stroke="#1c2233" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="53" cy="76" r="2.8" fill="#38d6ff" />
    </g>

    <!-- 工程師阿明 -->
    <g v-else-if="art === 'engineer'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#3f6fe8" />
      <path d="M40 90 Q60 112 80 90 L76 88 Q60 100 44 88 Z" fill="#2c52b8" />
      <path d="M52 100 L52 124 M68 100 L68 124" stroke="#9fc0ff" stroke-width="2" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C36 30 48 22 62 22 C76 22 86 32 82 50 C78 40 70 36 60 38 C50 36 42 40 38 50 Z" fill="#20212e" />
      <path d="M42 34 L50 26 L54 34 Z" fill="#20212e" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <rect x="43" y="52" width="17" height="13" rx="5" fill="rgba(160,220,255,.18)" stroke="#e8eefc" stroke-width="2.4" />
      <rect x="60" y="52" width="17" height="13" rx="5" fill="rgba(160,220,255,.18)" stroke="#e8eefc" stroke-width="2.4" />
      <path d="M59 58 L61 58" stroke="#e8eefc" stroke-width="2.4" />
      <path d="M54 69 Q60 73 66 69" fill="none" stroke="#a9604a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="76" y="92" width="22" height="16" rx="3" fill="#1b2438" stroke="#38d6ff" stroke-width="1.6" />
      <path d="M81 98 L85 101 L81 104 M89 104 L94 104" fill="none" stroke="#38d6ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- 主管 -->
    <g v-else-if="art === 'boss'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#2b3550" />
      <path d="M44 88 L60 110 L76 88 L70 86 L60 96 L50 86 Z" fill="#f4f6fb" />
      <path d="M57 96 L63 96 L66 124 L54 124 Z" fill="#d23a4e" />
      <path d="M57 96 L63 96 L61.5 102 L58.5 102 Z" fill="#a62a3c" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 52 C38 36 46 30 60 30 C74 30 82 36 81 52 C78 44 74 42 70 40 C64 44 54 44 50 40 C46 42 42 46 39 52 Z" fill="#aeb6c6" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 Q52 49 57 52 M63 52 Q68 49 74 52" fill="none" stroke="#7d8696" stroke-width="2.4" stroke-linecap="round" />
      <path d="M53 70 Q60 74 67 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M96 100 l8 -8 l8 8 l-8 8 Z" fill="#ffd36b" stroke="#b78b22" stroke-width="1.4" />
    </g>

    <!-- 董事長：白髮、酒紅西裝、金領帶 -->
    <g v-else-if="art === 'chairman'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#6b2234" />
      <path d="M44 88 L60 110 L76 88 L70 86 L60 96 L50 86 Z" fill="#f4f6fb" />
      <path d="M57 96 L63 96 L66 124 L54 124 Z" fill="#e0b23c" />
      <path d="M57 96 L63 96 L61.5 102 L58.5 102 Z" fill="#b88a1e" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 54 C36 40 44 31 60 31 C76 31 84 40 81 54 C79 46 76 43 72 42 C66 38 54 38 48 42 C44 43 41 46 39 54 Z" fill="#eef1f6" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="52" cy="58" r="6" fill="none" stroke="#3a3f4c" stroke-width="1.8" />
      <circle cx="68" cy="58" r="6" fill="none" stroke="#3a3f4c" stroke-width="1.8" />
      <path d="M58 58 L62 58" stroke="#3a3f4c" stroke-width="1.8" />
      <path d="M50 70 Q60 66 70 70 Q60 76 50 70 Z" fill="#eef1f6" />
      <g class="coin">
        <circle cx="104" cy="100" r="8" fill="#ffd36b" stroke="#b78b22" stroke-width="1.4" />
        <path d="M104 95 L104 105 M101 97.5 Q104 96 107 97.5 Q104 100 101 102.5 Q104 104 107 102.5" fill="none" stroke="#b78b22" stroke-width="1.4" stroke-linecap="round" />
      </g>
    </g>

    <!-- IT 管理員 -->
    <g v-else-if="art === 'it'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#1f7f62" />
      <path d="M40 90 Q60 114 80 90 Q80 84 60 84 Q40 84 40 90 Z" fill="#14594a" />
      <path d="M36 84 C36 104 84 104 84 84" fill="none" stroke="#10121c" stroke-width="5" stroke-linecap="round" />
      <rect x="30" y="80" width="10" height="16" rx="5" fill="#10121c" />
      <rect x="80" y="80" width="10" height="16" rx="5" fill="#10121c" />
      <rect x="51" y="70" width="18" height="20" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M36 52 C34 30 48 20 62 20 C76 20 88 30 84 52 L80 50 C76 40 70 34 60 34 C50 34 44 40 40 50 Z" fill="#1c1c28" />
      <path d="M36 44 C40 34 46 30 54 28 L60 22" fill="none" stroke="#38d6ff" stroke-width="2" opacity="0.6" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="52" cy="58" r="8.5" fill="none" stroke="#2cf5a0" stroke-width="2.2" />
      <circle cx="68" cy="58" r="8.5" fill="none" stroke="#2cf5a0" stroke-width="2.2" />
      <path d="M60.5 57 L59.5 57" stroke="#2cf5a0" stroke-width="2.2" />
      <path d="M55 69 L65 69" stroke="#8a4a3a" stroke-width="2.6" stroke-linecap="round" />
      <g transform="translate(86 96)">
        <g class="swing">
        <circle r="7" fill="none" stroke="#ffd36b" stroke-width="2.4" />
        <path d="M7 0 L20 0 M14 0 L14 5 M19 0 L19 4" stroke="#ffd36b" stroke-width="2.4" stroke-linecap="round" />
        </g>
      </g>
    </g>

    <!-- 新人 -->
    <g v-else-if="art === 'newhire'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#ff9442" />
      <path d="M44 88 L60 102 L76 88 Z" fill="#fff4e6" />
      <path d="M48 90 L48 112 M72 90 L72 112" stroke="#2a3347" stroke-width="3" />
      <rect x="38" y="108" width="24" height="16" rx="3" fill="#ffe14a" stroke="#c9a400" stroke-width="1.4" />
      <text x="50" y="119.5" text-anchor="middle" font-size="8.5" font-weight="900" fill="#7a5a00" font-family="Orbitron, sans-serif">NEW</text>
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 52 C34 32 44 20 60 20 C76 20 86 32 82 52 C80 42 74 36 66 38 C60 30 50 32 44 38 C40 42 38 46 38 52 Z" fill="#7a4a2a" />
      <circle class="eye" cx="52" cy="58" r="3" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="3" fill="#1a1a24" />
      <circle class="eye" cx="53" cy="57" r="1" fill="#fff" />
      <circle class="eye" cx="69" cy="57" r="1" fill="#fff" />
      <path d="M52 66 Q60 76 68 66 Z" fill="#fff" stroke="#b5475c" stroke-width="2" stroke-linejoin="round" />
      <path d="M96 22 l3 8 l8 1 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -1 Z" fill="#ffd36b" opacity="0.9" />
    </g>

    <!-- 會計／行政（工廠會計阿惠、學校教務組長）：綠色開襟衫、包頭、老花眼鏡、計算機 -->
    <g v-else-if="art === 'clerk'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#4f8a6a" />
      <path d="M46 88 L60 106 L74 88 Z" fill="#f6efe0" />
      <circle cx="60" cy="112" r="2.2" fill="#e8dcc0" />
      <circle cx="60" cy="120" r="2.2" fill="#e8dcc0" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <circle cx="60" cy="25" r="10" fill="#5a3f34" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 54 C37 36 46 30 60 30 C74 30 83 36 81 54 C78 44 72 39 60 39 C48 39 42 44 39 54 Z" fill="#5a3f34" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M44 57 Q51 65 58 57 Z M62 57 Q69 65 76 57 Z" fill="rgba(160,220,255,.18)" stroke="#7a3b2e" stroke-width="2.2" stroke-linejoin="round" />
      <path d="M58 57 L62 57" stroke="#7a3b2e" stroke-width="2.2" />
      <path d="M54 70 Q60 74 66 70" fill="none" stroke="#a9604a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="82" y="90" width="20" height="28" rx="3" fill="#2a3347" stroke="#9fb4d6" stroke-width="1.4" />
      <rect x="85" y="93" width="14" height="6" rx="1" fill="#9df5c8" />
      <g fill="#9fb4d6">
        <rect x="85" y="102" width="4" height="4" rx="1" /><rect x="90" y="102" width="4" height="4" rx="1" /><rect x="95" y="102" width="4" height="4" rx="1" />
        <rect x="85" y="108" width="4" height="4" rx="1" /><rect x="90" y="108" width="4" height="4" rx="1" /><rect x="95" y="108" width="4" height="4" rx="1" fill="#ffb02e" />
      </g>
    </g>

    <!-- 工廠領班：黃色安全帽、反光背心 -->
    <g v-else-if="art === 'worker'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#2f4466" />
      <path d="M22 124 C22 104 30 92 46 89 L52 124 Z M98 124 C98 104 90 92 74 89 L68 124 Z" fill="#ff8a2a" />
      <path d="M24 110 L50 110 M70 110 L96 110" stroke="#f3f6c8" stroke-width="4" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M43 66 Q60 86 77 66 Q73 79 60 80 Q47 79 43 66 Z" fill="#6b4a3a" opacity="0.28" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 L57 51 M63 51 L74 52" stroke="#3a2a22" stroke-width="3" stroke-linecap="round" />
      <path d="M54 70 Q60 73 66 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M38 46 C38 26 48 19 60 19 C72 19 82 26 82 46 Z" fill="#ffc83a" />
      <rect x="57" y="19" width="6" height="25" rx="3" fill="#e0a817" />
      <rect x="32" y="43" width="56" height="7" rx="3.5" fill="#e0a817" />
      <g class="spin">
        <path d="M100 94 l7 4 v8 l-7 4 l-7 -4 v-8 Z" fill="#c9d3e6" stroke="#6f7d98" stroke-width="1.4" />
        <circle cx="100" cy="102" r="2.6" fill="#6f7d98" />
      </g>
    </g>

    <!-- 廠長：白色安全帽、襯衫領帶、八字鬍、夾板 -->
    <g v-else-if="art === 'plantboss'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#8fb3d9" />
      <path d="M46 88 L60 100 L74 88 L68 86 L60 94 L52 86 Z" fill="#dfeaf6" />
      <path d="M57 96 L63 96 L65 124 L55 124 Z" fill="#2b3550" />
      <rect x="72" y="102" width="12" height="10" rx="1.5" fill="#7ca2cc" />
      <path d="M75 98 V106 M79 97 V106" stroke="#d23a4e" stroke-width="2" stroke-linecap="round" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M40 58 C39 52 40 48 42 45 L45 58 Z M80 58 C81 52 80 48 78 45 L75 58 Z" fill="#8a919e" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M51 67 Q56 63 60 66 Q64 63 69 67 Q64 70 60 68 Q56 70 51 67 Z" fill="#4a4f5b" />
      <path d="M55 73 Q60 75 65 73" fill="none" stroke="#8a4a3a" stroke-width="2.2" stroke-linecap="round" />
      <path d="M38 46 C38 26 48 19 60 19 C72 19 82 26 82 46 Z" fill="#f4f6fb" />
      <rect x="57" y="19" width="6" height="25" rx="3" fill="#cfd6e2" />
      <rect x="32" y="43" width="56" height="7" rx="3.5" fill="#cfd6e2" />
      <rect x="88" y="88" width="22" height="30" rx="2" fill="#c89a5a" />
      <rect x="91" y="93" width="16" height="22" fill="#fff" />
      <path d="M94 99 H104 M94 104 H104 M94 109 H101" stroke="#8a95a8" stroke-width="1.6" />
      <rect x="95" y="86" width="8" height="5" rx="1.5" fill="#6f7d98" />
    </g>

    <!-- 新創行銷：紫色毛衣、高馬尾、手機 -->
    <g v-else-if="art === 'marketer'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#8b6cf0" />
      <path d="M48 88 Q60 102 72 88 Z" fill="#6a4fd0" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M72 30 C94 26 100 52 88 74 C84 58 80 44 70 38 Z" fill="#c2733a" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C39 34 48 26 60 26 C72 26 82 34 81 50 C76 40 66 36 56 38 C48 40 43 44 40 52 Z" fill="#c2733a" />
      <circle cx="77" cy="31" r="3.6" fill="#ff5fa2" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M53 67 Q60 75 67 67" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <circle cx="41" cy="67" r="2.2" fill="#ffd36b" />
      <circle cx="79" cy="67" r="2.2" fill="#ffd36b" />
      <rect x="84" y="90" width="15" height="25" rx="3" fill="#1b2438" stroke="#c9b8ff" stroke-width="1.6" />
      <path class="beat" d="M91.5 106 C86 101 88 96 91.5 99 C95 96 97 101 91.5 106 Z" fill="#ff5fa2" />
    </g>

    <!-- 新創工程師：帽 T、掛在脖子上的耳機、亂髮、咖啡 -->
    <g v-else-if="art === 'dev'">
      <path d="M30 96 C26 76 40 66 60 66 C80 66 94 76 90 96 Z" fill="#3a4152" />
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#4a5268" />
      <path d="M54 92 V110 M66 92 V110" stroke="#cfd6e2" stroke-width="2" stroke-linecap="round" />
      <path d="M42 112 H78 L74 124 H46 Z" fill="#3a4152" />
      <rect x="51" y="70" width="18" height="20" rx="7" fill="#e0a57d" />
      <path d="M40 84 C40 98 80 98 80 84" fill="none" stroke="#ff6f3c" stroke-width="5" />
      <rect x="34" y="78" width="11" height="15" rx="5" fill="#ff6f3c" />
      <rect x="75" y="78" width="11" height="15" rx="5" fill="#ff6f3c" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C34 30 46 20 60 20 C76 20 88 30 82 50 L78 42 L74 48 L70 38 L64 44 L58 36 L52 44 L46 38 L42 48 Z" fill="#2e2a3a" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M47 63 Q52 65 56 63 M64 63 Q68 65 73 63" fill="none" stroke="#b98a6a" stroke-width="1.6" stroke-linecap="round" />
      <path d="M55 70 Q60 72 65 70" fill="none" stroke="#a9604a" stroke-width="2.4" stroke-linecap="round" />
      <path class="steam" d="M90 92 q-3 -4 0 -8 q3 -4 0 -8" fill="none" stroke="#cfd6e2" stroke-width="1.8" stroke-linecap="round" />
      <path class="steam late" d="M97 92 q-3 -4 0 -8 q3 -4 0 -8" fill="none" stroke="#cfd6e2" stroke-width="1.8" stroke-linecap="round" />
      <path d="M86 98 H102 L100 118 H88 Z" fill="#f4f6fb" />
      <rect x="85" y="95" width="18" height="4" rx="2" fill="#3a4152" />
      <rect x="87" y="104" width="14" height="6" fill="#ff6f3c" />
    </g>

    <!-- 新創執行長：黑色高領衫、整齊油頭、火箭別針 -->
    <g v-else-if="art === 'ceo'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#1d2230" />
      <rect x="51" y="70" width="18" height="16" rx="7" fill="#d9a07a" />
      <rect x="47" y="80" width="26" height="13" rx="6" fill="#2a3042" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C36 30 48 22 62 22 C76 22 86 30 82 48 C80 40 74 36 64 36 C56 36 50 34 46 30 C42 36 40 42 38 50 Z" fill="#3b2a22" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 Q52 50 57 52 M63 52 Q68 50 74 52" fill="none" stroke="#3b2a22" stroke-width="2.4" stroke-linecap="round" />
      <path d="M53 68 Q61 74 68 67" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M96 114 C92 106 94 96 100 90 C106 96 108 106 104 114 Z" fill="#e070ff" />
      <circle cx="100" cy="102" r="2.6" fill="#fff" />
      <path class="flame" d="M96 112 L92 118 L98 115 Z M104 112 L108 118 L102 115 Z" fill="#ff9442" />
    </g>

    <!-- DevOps：毛帽、帽 T、筆電上的終端機 -->
    <g v-else-if="art === 'devops'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#1f7f86" />
      <path d="M40 90 Q60 112 80 90 Q80 84 60 84 Q40 84 40 90 Z" fill="#14595e" />
      <rect x="51" y="70" width="18" height="20" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M37 50 C36 28 48 20 60 20 C72 20 84 28 83 50 Z" fill="#ff9442" />
      <rect x="35" y="43" width="50" height="10" rx="4" fill="#e07a2a" />
      <path d="M41 45 V51 M47 45 V51 M53 45 V51 M59 45 V51 M65 45 V51 M71 45 V51 M77 45 V51" stroke="#c9661f" stroke-width="1.6" />
      <circle cx="60" cy="18" r="5" fill="#ffd36b" />
      <circle class="eye" cx="52" cy="60" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="60" r="2.4" fill="#1a1a24" />
      <path d="M46 70 Q60 84 74 70" fill="none" stroke="#3a2a22" stroke-width="3.4" opacity="0.45" stroke-linecap="round" />
      <path d="M55 71 Q60 74 65 71" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="74" y="90" width="32" height="22" rx="3" fill="#1b2438" stroke="#2cf5a0" stroke-width="1.6" />
      <path d="M79 97 L83 100 L79 103" fill="none" stroke="#2cf5a0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <path class="cursor" d="M86 103 H94" fill="none" stroke="#2cf5a0" stroke-width="1.8" stroke-linecap="round" />
      <rect x="70" y="112" width="40" height="4" rx="2" fill="#5a6f92" />
    </g>

    <!-- 護理師：護士帽、水藍色制服、識別證 -->
    <g v-else-if="art === 'nurse'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#3fb6b0" />
      <path d="M48 88 L60 104 L72 88 Z" fill="#2a8f8a" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M36 72 C32 42 44 28 60 28 C76 28 88 42 84 72 C80 76 76 74 76 68 L76 52 L44 52 L44 68 C44 74 40 76 36 72 Z" fill="#3a2630" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C42 38 50 34 60 34 C70 34 78 38 80 52 C72 46 64 44 60 47 C56 44 48 46 40 52 Z" fill="#3a2630" />
      <path d="M44 36 L46 23 Q60 17 74 23 L76 36 Q60 31 44 36 Z" fill="#fff" stroke="#d6e4ea" stroke-width="1.2" />
      <path d="M60 23 V31 M56 27 H64" stroke="#e5484d" stroke-width="2.6" stroke-linecap="round" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M53 68 Q60 74 67 68" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <rect x="74" y="98" width="15" height="11" rx="2" fill="#fff" />
      <path d="M77 101.5 H86 M77 105 H82" stroke="#3fb6b0" stroke-width="1.6" stroke-linecap="round" />
    </g>

    <!-- 醫師：白袍、藍色刷手服、聽診器 -->
    <g v-else-if="art === 'doctor'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#f4f6fb" />
      <path d="M46 88 L60 124 L74 88 Z" fill="#4a7fd6" />
      <path d="M46 88 L56 110 L50 124 M74 88 L64 110 L70 124" fill="none" stroke="#c9d1df" stroke-width="2.4" stroke-linejoin="round" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C36 30 48 22 62 22 C76 22 86 32 82 50 C80 42 76 38 70 36 C64 40 52 40 46 36 C42 40 40 44 38 50 Z" fill="#2a2420" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M54 69 Q60 73 66 69" fill="none" stroke="#a9604a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M43 88 C38 102 44 112 54 112 M77 88 C82 102 76 112 66 112" fill="none" stroke="#3a3f4c" stroke-width="3" stroke-linecap="round" />
      <path d="M54 112 Q60 117 66 112" fill="none" stroke="#3a3f4c" stroke-width="3" />
      <circle cx="60" cy="117" r="5" fill="#9aa6bd" stroke="#3a3f4c" stroke-width="2" />
      <rect x="80" y="100" width="13" height="10" rx="1.5" fill="#e3e8f0" />
      <path d="M84 95 V104 M88 96 V104" stroke="#3f6fe8" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- 院長：白袍套西裝、灰髮、眼鏡、醫院徽章 -->
    <g v-else-if="art === 'director'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#f4f6fb" />
      <path d="M46 88 L60 124 L74 88 Z" fill="#2b3550" />
      <path d="M50 88 L60 102 L70 88 Z" fill="#fff" />
      <path d="M58 94 L62 94 L63.5 112 L60 116 L56.5 112 Z" fill="#2c8a7d" />
      <path d="M46 88 L56 110 L50 124 M74 88 L64 110 L70 124" fill="none" stroke="#c9d1df" stroke-width="2.4" stroke-linejoin="round" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 52 C38 36 46 30 60 30 C74 30 82 36 81 52 C78 44 74 42 70 40 C64 44 54 44 50 40 C46 42 42 46 39 52 Z" fill="#c3c9d4" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <rect x="44" y="53" width="15" height="11" rx="4" fill="none" stroke="#3a3f4c" stroke-width="2" />
      <rect x="61" y="53" width="15" height="11" rx="4" fill="none" stroke="#3a3f4c" stroke-width="2" />
      <path d="M59 57 L61 57" stroke="#3a3f4c" stroke-width="2" />
      <path d="M54 71 Q60 74 66 71" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="80" y="100" width="16" height="13" rx="2" fill="#2c8a7d" />
      <path d="M88 102.5 V110.5 M84 106.5 H92" stroke="#fff" stroke-width="2.2" stroke-linecap="round" />
    </g>

    <!-- 老師：芥末黃開襟衫、長髮、圓框眼鏡、課本 -->
    <g v-else-if="art === 'teacher'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#d9a43a" />
      <path d="M47 88 L60 104 L73 88 Z" fill="#fff8ec" />
      <circle cx="56" cy="114" r="2" fill="#a87a22" />
      <circle cx="56" cy="121" r="2" fill="#a87a22" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M36 86 C30 52 40 26 60 26 C80 26 90 52 84 86 C80 90 76 88 76 82 L76 52 L44 52 L44 82 C44 88 40 90 36 86 Z" fill="#2a2030" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C40 34 50 30 60 30 C72 30 80 36 80 50 C70 46 60 42 52 36 C48 42 44 46 40 52 Z" fill="#2a2030" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <circle cx="52" cy="58" r="7" fill="rgba(160,220,255,.15)" stroke="#8a4a3a" stroke-width="2" />
      <circle cx="68" cy="58" r="7" fill="rgba(160,220,255,.15)" stroke="#8a4a3a" stroke-width="2" />
      <path d="M59 58 L61 58" stroke="#8a4a3a" stroke-width="2" />
      <path d="M54 69 Q60 74 66 69" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <path d="M82 96 L100 92 L100 116 L82 120 Z" fill="#3f6fe8" />
      <path d="M82 96 L79 98 L79 122 L82 120 Z" fill="#2c52b8" />
      <path d="M86 101 L96 99 M86 106 L96 104" stroke="#cfe0ff" stroke-width="1.6" stroke-linecap="round" />
    </g>

    <!-- 學生：白襯衫制服、書包背帶、刺蝟頭、OK 繃 -->
    <g v-else-if="art === 'student'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#f4f6fb" />
      <path d="M46 88 L54 99 L60 90 L66 99 L74 88 Z" fill="#dfe5ef" />
      <path d="M60 92 V124" stroke="#dfe5ef" stroke-width="2" />
      <rect x="66" y="104" width="13" height="4" rx="1" fill="#3f6fe8" />
      <path d="M30 98 L38 124 M90 98 L82 124" stroke="#3f6fe8" stroke-width="7" stroke-linecap="round" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C34 32 44 22 60 22 C76 22 86 32 82 50 L80 40 L74 34 L70 41 L64 30 L58 39 L52 30 L48 41 L42 36 Z" fill="#1c1c28" />
      <circle class="eye" cx="52" cy="58" r="3" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="3" fill="#1a1a24" />
      <circle class="eye" cx="53" cy="57" r="1" fill="#fff" />
      <circle class="eye" cx="69" cy="57" r="1" fill="#fff" />
      <path d="M52 66 Q60 76 68 66 Z" fill="#fff" stroke="#b5475c" stroke-width="2" stroke-linejoin="round" />
      <rect x="68" y="63" width="10" height="5" rx="2.5" fill="#f2c79a" transform="rotate(-20 73 65.5)" />
    </g>

    <!-- 資訊組老師：Polo 衫、方框眼鏡、識別證、Wi-Fi -->
    <g v-else-if="art === 'itteacher'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#2c5c8f" />
      <path d="M46 88 L60 98 L74 88 L70 85 L60 92 L50 85 Z" fill="#244b75" />
      <path d="M48 90 L60 110 L72 90" fill="none" stroke="#ffd36b" stroke-width="2.4" />
      <rect x="54" y="108" width="12" height="15" rx="2" fill="#fff" />
      <rect x="57" y="111" width="6" height="5" rx="1" fill="#2c5c8f" />
      <rect x="51" y="70" width="18" height="20" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C36 30 48 22 62 22 C76 22 86 32 82 50 C80 42 76 38 70 36 C64 40 52 40 46 36 C42 40 40 44 38 50 Z" fill="#1c1c28" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <rect x="43" y="52" width="17" height="12" rx="2" fill="rgba(160,220,255,.15)" stroke="#1c1c28" stroke-width="2.4" />
      <rect x="60" y="52" width="17" height="12" rx="2" fill="rgba(160,220,255,.15)" stroke="#1c1c28" stroke-width="2.4" />
      <path d="M54 70 Q60 73 66 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path class="wifi w2" d="M88 102 Q98 91 108 102" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" />
      <path class="wifi w1" d="M92 106 Q98 100 104 106" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="98" cy="111" r="2.8" fill="#38d6ff" />
    </g>

    <!-- 醫院資訊室：院內制服、耳掛對講機、醫院識別證、網路線 -->
    <g v-else-if="art === 'medit'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#2c8a7d" />
      <path d="M46 88 L60 98 L74 88 L70 85 L60 92 L50 85 Z" fill="#1f6b60" />
      <path d="M48 90 L60 110 L72 90" fill="none" stroke="#e5484d" stroke-width="2.4" />
      <rect x="54" y="108" width="12" height="15" rx="2" fill="#fff" />
      <path d="M60 111 V119 M56 115 H64" stroke="#e5484d" stroke-width="2" stroke-linecap="round" />
      <rect x="51" y="70" width="18" height="20" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 52 C34 30 46 22 60 22 C74 22 86 30 82 52 C80 40 72 34 60 34 C48 34 40 40 38 52 Z" fill="#4a3428" />
      <rect x="35" y="50" width="6" height="12" rx="3" fill="#1c2233" />
      <path d="M38 62 C38 70 44 72 48 70" fill="none" stroke="#1c2233" stroke-width="2" stroke-linecap="round" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M54 70 Q60 73 66 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="88" y="94" width="18" height="12" rx="2" fill="#3a4a68" stroke="#38d6ff" stroke-width="1.6" />
      <path d="M92 106 V112 M97 106 V112 M102 106 V112" stroke="#38d6ff" stroke-width="2" stroke-linecap="round" />
      <path d="M97 112 C97 120 90 122 84 122" fill="none" stroke="#ffd36b" stroke-width="2.4" stroke-linecap="round" />
    </g>

    <!-- 網管小葉：馬尾、青綠襯衫、耳機麥克風、路由器 -->
    <g v-else-if="art === 'netadmin'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#2a9d8f" />
      <path d="M46 88 L60 102 L74 88 Z" fill="#e8fbf7" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M78 34 C94 40 94 64 84 78 C86 62 84 48 74 40 Z" fill="#3b2618" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C38 34 48 26 60 26 C74 26 82 34 80 52 C74 42 66 38 60 40 C52 38 44 42 40 52 Z" fill="#3b2618" />
      <circle cx="79" cy="38" r="3.2" fill="#ffd36b" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M53 68 Q60 73 67 68" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.45" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.45" />
      <path d="M38 54 C38 40 46 34 60 34 C74 34 82 40 82 54" fill="none" stroke="#1c2233" stroke-width="3.2" stroke-linecap="round" />
      <rect x="33" y="52" width="7" height="13" rx="3.5" fill="#1c2233" />
      <path d="M36 63 C36 73 43 77 51 75" fill="none" stroke="#1c2233" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="52" cy="75" r="2.6" fill="#38d6ff" />
      <path d="M88 98 L85 88 M102 98 L105 88" stroke="#9aa6b8" stroke-width="2" stroke-linecap="round" />
      <rect x="82" y="98" width="26" height="11" rx="3" fill="#1b2438" stroke="#38d6ff" stroke-width="1.6" />
      <circle class="led" cx="89" cy="103.5" r="1.6" fill="#2cf5a0" style="--i: 0" />
      <circle class="led" cx="95" cy="103.5" r="1.6" fill="#2cf5a0" style="--i: 1" />
      <circle class="led" cx="101" cy="103.5" r="1.6" fill="#ffd36b" style="--i: 2" />
    </g>

    <!-- 資訊助理小琪：短鮑伯頭、淺藍針織外套、報修單 -->
    <g v-else-if="art === 'helpdesk'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#7fb3e8" />
      <path d="M50 88 L60 100 L70 88 Z" fill="#f4f6fb" />
      <path d="M50 88 L50 124 M70 88 L70 124" stroke="#5e93cc" stroke-width="2" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M36 62 C32 36 46 24 60 24 C74 24 88 36 84 62 C84 72 80 76 76 74 L76 50 C66 44 54 44 44 50 L44 74 C40 76 36 72 36 62 Z" fill="#2b1d16" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C42 34 52 30 62 30 C72 30 80 38 80 50 C70 42 56 40 40 52 Z" fill="#2b1d16" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M54 68 Q60 72 66 68" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <rect x="84" y="92" width="24" height="18" rx="3" fill="#ffe08a" stroke="#c99a2e" stroke-width="1.4" />
      <path d="M89 98 L103 98 M89 103 L99 103" stroke="#a37a1c" stroke-width="1.6" stroke-linecap="round" />
      <path d="M84 92 L96 86 L108 92" fill="none" stroke="#c99a2e" stroke-width="1.4" stroke-linejoin="round" />
    </g>

    <!-- 系統工程師老吳：灰白短髮、落腮鬍、灰色帽 T、咖啡杯 -->
    <g v-else-if="art === 'sysadmin'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#5b6476" />
      <path d="M36 92 C36 78 46 72 60 72 C74 72 84 78 84 92" fill="none" stroke="#454d5e" stroke-width="7" stroke-linecap="round" />
      <path d="M54 92 L52 108 M66 92 L68 108" stroke="#e9edf3" stroke-width="2" stroke-linecap="round" />
      <rect x="51" y="70" width="18" height="18" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 50 C36 30 48 22 62 22 C76 22 86 32 82 50 C78 40 70 36 60 38 C50 36 42 40 38 50 Z" fill="#7d838f" />
      <path d="M46 30 Q56 26 66 28" fill="none" stroke="#b7bcc6" stroke-width="2" stroke-linecap="round" />
      <path d="M41 60 C42 78 52 84 60 84 C68 84 78 78 79 60 C75 70 68 74 60 74 C52 74 45 70 41 60 Z" fill="#6b707b" />
      <circle class="eye" cx="52" cy="57" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="57" r="2.4" fill="#1a1a24" />
      <path d="M46 51 Q52 49 57 51 M63 51 Q68 49 74 51" fill="none" stroke="#5a5f6a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M55 70 Q60 72 65 70" fill="none" stroke="#3a3f4c" stroke-width="2.4" stroke-linecap="round" />
      <g transform="translate(84 92)">
        <path class="steam" d="M6 -4 Q3 -9 6 -14 M12 -4 Q9 -9 12 -14" fill="none" stroke="#c7d2e2" stroke-width="1.8" stroke-linecap="round" />
        <rect x="0" y="0" width="18" height="18" rx="3" fill="#f4f6fb" stroke="#9aa6b8" stroke-width="1.4" />
        <path d="M18 4 Q25 4 25 9 Q25 14 18 14" fill="none" stroke="#9aa6b8" stroke-width="2" />
        <path d="M4 7 L14 7" stroke="#38d6ff" stroke-width="2" stroke-linecap="round" />
      </g>
    </g>

    <!-- 資安分析師凱文：黑色帽 T 戴上帽子、綠色盾牌 -->
    <g v-else-if="art === 'secops'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#23283a" />
      <path d="M32 92 C26 64 38 26 60 26 C82 26 94 64 88 92 C80 86 72 84 60 84 C48 84 40 86 32 92 Z" fill="#2e3449" />
      <path d="M54 94 L52 112 M66 94 L68 112" stroke="#8a93a8" stroke-width="2" stroke-linecap="round" />
      <rect x="51" y="70" width="18" height="18" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="58" rx="18" ry="21" fill="url(#skinG)" />
      <path d="M42 52 C42 40 50 36 60 36 C70 36 78 40 78 52 C72 46 66 44 60 46 C54 44 48 46 42 52 Z" fill="#1c1c28" />
      <circle class="eye" cx="53" cy="60" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="67" cy="60" r="2.4" fill="#1a1a24" />
      <path d="M48 54 Q53 52 57 54 M63 54 Q67 52 72 54" fill="none" stroke="#1c1c28" stroke-width="2.2" stroke-linecap="round" />
      <path d="M55 70 Q60 72 65 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M96 88 L107 92 L107 101 C107 108 102 111 96 114 C90 111 85 108 85 101 L85 92 Z" fill="#2cf5a0" stroke="#14805a" stroke-width="1.6" />
      <path d="M90 101 L94.5 105.5 L102 97" fill="none" stroke="#0f5a3e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- 雲端架構師安娜：盤髮、紫色西裝外套、雲朵 -->
    <g v-else-if="art === 'cloud'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#6b4fd1" />
      <path d="M46 88 L60 106 L74 88 L68 86 L60 96 L52 86 Z" fill="#f4f1ff" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <circle cx="60" cy="22" r="9" fill="#4a2a2e" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C38 34 48 28 60 28 C72 28 82 34 80 52 C74 42 66 38 60 40 C54 38 46 42 40 52 Z" fill="#4a2a2e" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M45 53 Q51 51 56 53 M64 53 Q69 51 75 53" fill="none" stroke="#4a2a2e" stroke-width="2" stroke-linecap="round" />
      <path d="M54 68 Q60 72 66 68" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="41" cy="64" r="2" fill="#ffd36b" />
      <circle cx="79" cy="64" r="2" fill="#ffd36b" />
      <g class="bob">
        <path d="M86 108 C79 108 79 98 87 98 C88 91 98 90 100 97 C108 96 109 108 101 108 Z" fill="#e8f1ff" stroke="#6b8fd6" stroke-width="1.6" />
        <path d="M93 104 L93 100 M93 100 L90.5 102.5 M93 100 L95.5 102.5" fill="none" stroke="#6b8fd6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    </g>

    <!-- 組長阿誠：捲起袖子的藍襯衫、識別證掛繩 -->
    <g v-else-if="art === 'teamlead'">
      <path d="M8 124 C8 98 30 88 60 88 C90 88 112 98 112 124 Z" fill="#4f7cac" />
      <path d="M46 88 L60 100 L74 88 L68 86 L60 94 L52 86 Z" fill="#dce8f5" />
      <path d="M50 90 L58 108 M70 90 L62 108" stroke="#d23a4e" stroke-width="2.4" />
      <rect x="53" y="106" width="14" height="11" rx="2" fill="#f4f6fb" stroke="#9aa6b8" stroke-width="1.2" />
      <rect x="56" y="109" width="5" height="5" rx="1" fill="#7fb3e8" />
      <rect x="51" y="70" width="18" height="18" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M38 48 C38 30 48 24 60 24 C74 24 84 30 82 48 C80 40 76 36 70 34 L66 38 L62 33 L56 38 L52 33 L46 38 C42 40 40 44 38 48 Z" fill="#20212e" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 Q52 49 57 52 M63 52 Q68 49 74 52" fill="none" stroke="#20212e" stroke-width="2.4" stroke-linecap="round" />
      <path d="M52 68 Q60 76 68 68" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M92 96 L100 104 L110 90" fill="none" stroke="#2cf5a0" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- 課長老李：地中海髮型、咖啡色西裝、綠領帶、文件夾 -->
    <g v-else-if="art === 'section'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#6b4a2b" />
      <path d="M44 88 L60 110 L76 88 L70 86 L60 96 L50 86 Z" fill="#f4f6fb" />
      <path d="M57 96 L63 96 L66 124 L54 124 Z" fill="#2f8a5c" />
      <path d="M57 96 L63 96 L61.5 102 L58.5 102 Z" fill="#226b47" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 58 C37 48 40 42 44 40 L46 54 Z M81 58 C83 48 80 42 76 40 L74 54 Z" fill="#6f6a66" />
      <path d="M50 36 Q60 32 70 36" fill="none" stroke="#fff3e6" stroke-width="2.4" stroke-linecap="round" opacity="0.7" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 Q52 50 57 52 M63 52 Q68 50 74 52" fill="none" stroke="#6f6a66" stroke-width="2.4" stroke-linecap="round" />
      <path d="M50 66 Q55 64 60 66 Q65 64 70 66" fill="none" stroke="#4a3a32" stroke-width="2.6" stroke-linecap="round" />
      <path d="M54 71 Q60 74 66 71" fill="none" stroke="#8a4a3a" stroke-width="2.2" stroke-linecap="round" />
      <rect x="86" y="92" width="20" height="24" rx="2" fill="#c9a26b" />
      <rect x="89" y="96" width="14" height="17" fill="#fff" />
      <path d="M91 101 L101 101 M91 105 L101 105 M91 109 L97 109" stroke="#9aa6b8" stroke-width="1.4" stroke-linecap="round" />
      <rect x="92" y="89" width="8" height="5" rx="1.5" fill="#6b7280" />
    </g>

    <!-- 業務經理趙姐：俐落短髮、海軍藍西裝、上升的業績長條 -->
    <g v-else-if="art === 'salesmgr'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#24365e" />
      <path d="M46 88 L60 104 L74 88 L68 86 L60 94 L52 86 Z" fill="#fdf2f4" />
      <circle cx="60" cy="98" r="2.4" fill="#ffd36b" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <path d="M38 60 C34 36 46 24 60 24 C74 24 86 36 82 60 C80 66 76 66 76 62 L76 48 C66 44 54 44 44 48 L44 62 C44 66 40 66 38 60 Z" fill="#2a1a14" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 50 C42 32 54 28 64 30 C74 32 80 40 80 48 C72 38 58 36 48 42 C44 44 42 46 40 50 Z" fill="#2a1a14" />
      <circle class="eye" cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle class="eye" cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M46 53 Q51 51 56 53 M64 53 Q69 51 74 53" fill="none" stroke="#2a1a14" stroke-width="2" stroke-linecap="round" />
      <path d="M53 68 Q60 73 67 68" fill="none" stroke="#c03a52" stroke-width="2.6" stroke-linecap="round" />
      <rect x="86" y="102" width="5" height="12" rx="1" fill="#38d6ff" />
      <rect x="94" y="96" width="5" height="18" rx="1" fill="#2cf5a0" />
      <rect x="102" y="89" width="5" height="25" rx="1" fill="#ffd36b" />
    </g>

    <!-- 財務長周姐：灰黑盤髮、細框眼鏡、深綠西裝、金幣 -->
    <g v-else-if="art === 'cfo'">
      <path d="M10 124 C10 98 32 88 60 88 C88 88 110 98 110 124 Z" fill="#1f4d3e" />
      <path d="M46 88 L60 104 L74 88 L68 86 L60 94 L52 86 Z" fill="#f4f6fb" />
      <path d="M52 100 Q60 106 68 100" fill="none" stroke="#f4e3b0" stroke-width="2" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#e0a57d" />
      <ellipse cx="60" cy="23" rx="12" ry="7" fill="#4a4550" />
      <ellipse cx="60" cy="56" rx="19" ry="22" fill="url(#skinG)" />
      <path d="M40 52 C38 34 48 28 60 28 C72 28 82 34 80 52 C76 40 68 36 60 38 C52 36 44 40 40 52 Z" fill="#4a4550" />
      <path d="M48 32 Q56 30 62 32" fill="none" stroke="#a7a2ad" stroke-width="2" stroke-linecap="round" />
      <circle class="eye" cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle class="eye" cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <rect x="44" y="53" width="15" height="10" rx="3" fill="none" stroke="#b78b22" stroke-width="1.8" />
      <rect x="61" y="53" width="15" height="10" rx="3" fill="none" stroke="#b78b22" stroke-width="1.8" />
      <path d="M59 57 L61 57" stroke="#b78b22" stroke-width="1.8" />
      <path d="M55 69 Q60 72 65 69" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <g class="coin">
        <circle cx="100" cy="102" r="9" fill="#ffd36b" stroke="#b78b22" stroke-width="1.4" />
        <path d="M100 96 L100 108 M96.5 99 Q100 97 103.5 99 Q100 102 96.5 105 Q100 107 103.5 105" fill="none" stroke="#b78b22" stroke-width="1.4" stroke-linecap="round" />
      </g>
    </g>

    <!-- AI 助理 -->
    <g v-else-if="art === 'ai'">
      <path d="M22 124 C22 100 40 92 60 92 C80 92 98 100 98 124 Z" fill="url(#metalG)" />
      <rect x="54" y="82" width="12" height="14" fill="#3a4a68" />
      <path d="M60 20 L60 10" stroke="#8fa8d0" stroke-width="3" stroke-linecap="round" />
      <circle cx="60" cy="9" r="4.5" fill="#e070ff" />
      <circle class="halo" cx="60" cy="9" r="8" fill="#e070ff" opacity="0.25" />
      <rect x="26" y="24" width="68" height="60" rx="18" fill="url(#metalG)" stroke="#8fa8d0" stroke-width="1.6" />
      <rect x="33" y="34" width="54" height="38" rx="12" fill="#0a1020" />
      <g class="glance">
        <rect class="eye" x="40" y="46" width="14" height="12" rx="5" fill="url(#screenG)" />
        <rect class="eye" x="66" y="46" width="14" height="12" rx="5" fill="url(#screenG)" />
        <circle class="eye" cx="44" cy="50" r="2" fill="#fff" opacity="0.9" />
        <circle class="eye" cx="70" cy="50" r="2" fill="#fff" opacity="0.9" />
      </g>
      <path d="M46 65 Q60 71 74 65" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" />
      <rect x="16" y="44" width="8" height="22" rx="4" fill="#5a6f92" />
      <rect x="96" y="44" width="8" height="22" rx="4" fill="#5a6f92" />
      <circle cx="60" cy="104" r="4" fill="#38d6ff" opacity="0.8" />
    </g>

    <!-- 基礎設施（伺服器機櫃） -->
    <g v-else-if="art === 'infra'">
      <rect x="26" y="12" width="68" height="100" rx="6" fill="#1a2438" stroke="#5a7ab0" stroke-width="2" />
      <g v-for="i in 4" :key="i">
        <rect x="32" :y="18 + (i - 1) * 23" width="56" height="19" rx="3" fill="url(#metalG)" stroke="#7d93b8" stroke-width="1" />
        <circle class="led" :style="{ '--i': i }" cx="40" :cy="27.5 + (i - 1) * 23" r="2.6" :fill="i % 2 ? '#2cf5a0' : '#38d6ff'" />
        <circle class="led slow" :style="{ '--i': i }" cx="48" :cy="27.5 + (i - 1) * 23" r="2.6" :fill="i === 3 ? '#ffb02e' : '#2cf5a0'" />
        <rect x="60" :y="24 + (i - 1) * 23" width="22" height="3" rx="1.5" fill="#0a1020" />
        <rect x="60" :y="29.5 + (i - 1) * 23" width="14" height="3" rx="1.5" fill="#0a1020" />
      </g>
      <path d="M94 96 C104 96 106 104 106 112 L106 124 M26 96 C16 96 14 104 14 112 L14 124" fill="none" stroke="#38d6ff" stroke-width="3" stroke-linecap="round" />
      <rect x="32" y="108" width="56" height="3" rx="1.5" fill="#38d6ff" opacity="0.5" />
    </g>

    <!-- 資料庫 -->
    <g v-else-if="art === 'db'">
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
      <path class="bob" d="M52 30 l8 -6 l8 6 M60 24 v14" fill="none" stroke="#0a3a32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
    </g>

    <!-- 備份 -->
    <g v-else-if="art === 'backup'">
      <rect x="22" y="30" width="76" height="62" rx="9" fill="url(#metalG)" stroke="#8fa8d0" stroke-width="2" />
      <rect x="30" y="38" width="60" height="30" rx="4" fill="#0a1020" />
      <circle cx="60" cy="53" r="9" fill="none" stroke="#38d6ff" stroke-width="3" />
      <path d="M60 48 V53 L64 56" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <g class="sync">
        <path d="M60 36 A17 17 0 1 1 43 53" fill="none" stroke="#2cf5a0" stroke-width="3" stroke-linecap="round" />
        <path d="M38 50 L43 57 L48 50 Z" fill="#2cf5a0" />
      </g>
      <rect x="30" y="74" width="30" height="8" rx="2" fill="#1a2438" />
      <circle class="led slow" cx="82" cy="78" r="4" fill="#2cf5a0" />
      <path d="M36 100 H84 M44 108 H76" stroke="#5a7ab0" stroke-width="3" stroke-linecap="round" opacity="0.5" />
    </g>
  </svg>
</template>

<style scoped>
.art {
  width: 100%;
  height: 100%;
}

/* ───────── 待機小動態：每個節點由外層給不同的 --phase，彼此不會同步 ───────── */
/* 只設在會動的元素上：帶 transform 屬性的圖形（例如斜貼的 OK 繃）不能被改掉原點 */
.eye,
.led,
.halo,
.glance,
.bob,
.spin,
.coin,
.beat,
.steam,
.flame {
  transform-box: fill-box;
  transform-origin: center;
}
.eye {
  animation: blink var(--blink, 5.2s) var(--phase, 0s) infinite;
}
@keyframes blink {
  0%,
  92%,
  97%,
  100% {
    transform: scaleY(1);
  }
  94.5% {
    transform: scaleY(0.1);
  }
}
.led {
  animation: led 2.3s calc(var(--phase, 0s) - var(--i, 0) * 0.61s) steps(1) infinite;
}
.led.slow {
  animation-duration: 3.4s;
}
@keyframes led {
  0%,
  70% {
    opacity: 1;
  }
  71%,
  80% {
    opacity: 0.3;
  }
}
.halo {
  animation: halo 2.6s var(--phase, 0s) ease-in-out infinite;
}
@keyframes halo {
  50% {
    transform: scale(1.45);
    opacity: 0.45;
  }
}
.glance {
  animation: glance 9s var(--phase, 0s) ease-in-out infinite;
}
@keyframes glance {
  0%,
  40%,
  100% {
    transform: translateX(0);
  }
  45%,
  55% {
    transform: translateX(-3px);
  }
  60%,
  70% {
    transform: translateX(3px);
  }
  75% {
    transform: translateX(0);
  }
}
.bob {
  animation: bob 2.4s var(--phase, 0s) ease-in-out infinite;
}
@keyframes bob {
  50% {
    transform: translateY(-3px);
  }
}
.sync {
  transform-box: view-box;
  transform-origin: 60px 53px;
  animation: spin 14s linear infinite;
}
.spin {
  animation: spin 9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.swing {
  transform-box: view-box;
  transform-origin: 0 0;
  animation: swing 3.2s var(--phase, 0s) ease-in-out infinite;
}
@keyframes swing {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(10deg);
  }
}
.coin {
  animation: coin 6s var(--phase, 0s) ease-in-out infinite;
}
@keyframes coin {
  0%,
  80%,
  100% {
    transform: scaleX(1);
  }
  85% {
    transform: scaleX(0.08);
  }
  90% {
    transform: scaleX(1);
  }
}
.beat {
  animation: beat 2.8s var(--phase, 0s) ease-in-out infinite;
}
@keyframes beat {
  0%,
  60%,
  100% {
    transform: scale(1);
  }
  66% {
    transform: scale(1.35);
  }
  72% {
    transform: scale(1);
  }
  78% {
    transform: scale(1.2);
  }
}
.steam {
  animation: steam 2.6s ease-out infinite;
  opacity: 0;
}
.steam.late {
  animation-delay: -1.3s;
}
@keyframes steam {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  30% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: translateY(-6px);
  }
}
.flame {
  transform-origin: 50% 0;
  animation: flame 0.35s ease-in-out infinite alternate;
}
@keyframes flame {
  to {
    transform: scaleY(1.35);
  }
}
.cursor {
  animation: led 1.1s steps(1) infinite;
}
.wifi {
  animation: wifi 2.4s var(--phase, 0s) ease-in-out infinite;
}
.wifi.w2 {
  animation-delay: calc(var(--phase, 0s) + 0.3s);
}
@keyframes wifi {
  0%,
  100% {
    opacity: 0.25;
  }
  40%,
  70% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .art * {
    animation: none !important;
  }
}
</style>
