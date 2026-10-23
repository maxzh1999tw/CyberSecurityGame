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
    <g v-else-if="art === 'engineer'">
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
    <g v-else-if="art === 'boss'">
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

    <!-- 董事長：白髮、酒紅西裝、金領帶 -->
    <g v-else-if="art === 'chairman'">
      <path d="M6 124 C6 98 30 88 60 88 C90 88 114 98 114 124 Z" fill="#6b2234" />
      <path d="M44 88 L60 110 L76 88 L70 86 L60 96 L50 86 Z" fill="#f4f6fb" />
      <path d="M57 96 L63 96 L66 124 L54 124 Z" fill="#e0b23c" />
      <path d="M57 96 L63 96 L61.5 102 L58.5 102 Z" fill="#b88a1e" />
      <rect x="51" y="70" width="18" height="22" rx="7" fill="#d9a07a" />
      <ellipse cx="60" cy="56" rx="20" ry="23" fill="url(#skinG)" />
      <path d="M39 54 C36 40 44 31 60 31 C76 31 84 40 81 54 C79 46 76 43 72 42 C66 38 54 38 48 42 C44 43 41 46 39 54 Z" fill="#eef1f6" />
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="52" cy="58" r="6" fill="none" stroke="#3a3f4c" stroke-width="1.8" />
      <circle cx="68" cy="58" r="6" fill="none" stroke="#3a3f4c" stroke-width="1.8" />
      <path d="M58 58 L62 58" stroke="#3a3f4c" stroke-width="1.8" />
      <path d="M50 70 Q60 66 70 70 Q60 76 50 70 Z" fill="#eef1f6" />
      <circle cx="104" cy="100" r="8" fill="#ffd36b" stroke="#b78b22" stroke-width="1.4" />
      <path d="M104 95 L104 105 M101 97.5 Q104 96 107 97.5 Q104 100 101 102.5 Q104 104 107 102.5" fill="none" stroke="#b78b22" stroke-width="1.4" stroke-linecap="round" />
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
    <g v-else-if="art === 'newhire'">
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 L57 51 M63 51 L74 52" stroke="#3a2a22" stroke-width="3" stroke-linecap="round" />
      <path d="M54 70 Q60 73 66 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M38 46 C38 26 48 19 60 19 C72 19 82 26 82 46 Z" fill="#ffc83a" />
      <rect x="57" y="19" width="6" height="25" rx="3" fill="#e0a817" />
      <rect x="32" y="43" width="56" height="7" rx="3.5" fill="#e0a817" />
      <path d="M100 94 l7 4 v8 l-7 4 l-7 -4 v-8 Z" fill="#c9d3e6" stroke="#6f7d98" stroke-width="1.4" />
      <circle cx="100" cy="102" r="2.6" fill="#6f7d98" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
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
      <circle cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle cx="68" cy="58" r="2.6" fill="#2a1a22" />
      <path d="M53 67 Q60 75 67 67" fill="none" stroke="#b5475c" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="47" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <ellipse cx="73" cy="65" rx="4" ry="2.4" fill="#ff9aa6" opacity="0.5" />
      <circle cx="41" cy="67" r="2.2" fill="#ffd36b" />
      <circle cx="79" cy="67" r="2.2" fill="#ffd36b" />
      <rect x="84" y="90" width="15" height="25" rx="3" fill="#1b2438" stroke="#c9b8ff" stroke-width="1.6" />
      <path d="M91.5 106 C86 101 88 96 91.5 99 C95 96 97 101 91.5 106 Z" fill="#ff5fa2" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M47 63 Q52 65 56 63 M64 63 Q68 65 73 63" fill="none" stroke="#b98a6a" stroke-width="1.6" stroke-linecap="round" />
      <path d="M55 70 Q60 72 65 70" fill="none" stroke="#a9604a" stroke-width="2.4" stroke-linecap="round" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M46 52 Q52 50 57 52 M63 52 Q68 50 74 52" fill="none" stroke="#3b2a22" stroke-width="2.4" stroke-linecap="round" />
      <path d="M53 68 Q61 74 68 67" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M96 114 C92 106 94 96 100 90 C106 96 108 106 104 114 Z" fill="#e070ff" />
      <circle cx="100" cy="102" r="2.6" fill="#fff" />
      <path d="M96 112 L92 118 L98 115 Z M104 112 L108 118 L102 115 Z" fill="#ff9442" />
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
      <circle cx="52" cy="60" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="60" r="2.4" fill="#1a1a24" />
      <path d="M46 70 Q60 84 74 70" fill="none" stroke="#3a2a22" stroke-width="3.4" opacity="0.45" stroke-linecap="round" />
      <path d="M55 71 Q60 74 65 71" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="74" y="90" width="32" height="22" rx="3" fill="#1b2438" stroke="#2cf5a0" stroke-width="1.6" />
      <path d="M79 97 L83 100 L79 103 M86 103 H94" fill="none" stroke="#2cf5a0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
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
      <circle cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle cx="68" cy="58" r="2.6" fill="#2a1a22" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
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
      <circle cx="52" cy="58" r="2.6" fill="#2a1a22" />
      <circle cx="68" cy="58" r="2.6" fill="#2a1a22" />
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
      <circle cx="52" cy="58" r="3" fill="#1a1a24" />
      <circle cx="68" cy="58" r="3" fill="#1a1a24" />
      <circle cx="53" cy="57" r="1" fill="#fff" />
      <circle cx="69" cy="57" r="1" fill="#fff" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <rect x="43" y="52" width="17" height="12" rx="2" fill="rgba(160,220,255,.15)" stroke="#1c1c28" stroke-width="2.4" />
      <rect x="60" y="52" width="17" height="12" rx="2" fill="rgba(160,220,255,.15)" stroke="#1c1c28" stroke-width="2.4" />
      <path d="M54 70 Q60 73 66 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <path d="M88 102 Q98 91 108 102 M92 106 Q98 100 104 106" fill="none" stroke="#38d6ff" stroke-width="2.6" stroke-linecap="round" />
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
      <circle cx="52" cy="58" r="2.4" fill="#1a1a24" />
      <circle cx="68" cy="58" r="2.4" fill="#1a1a24" />
      <path d="M54 70 Q60 73 66 70" fill="none" stroke="#8a4a3a" stroke-width="2.4" stroke-linecap="round" />
      <rect x="88" y="94" width="18" height="12" rx="2" fill="#3a4a68" stroke="#38d6ff" stroke-width="1.6" />
      <path d="M92 106 V112 M97 106 V112 M102 106 V112" stroke="#38d6ff" stroke-width="2" stroke-linecap="round" />
      <path d="M97 112 C97 120 90 122 84 122" fill="none" stroke="#ffd36b" stroke-width="2.4" stroke-linecap="round" />
    </g>

    <!-- AI 助理 -->
    <g v-else-if="art === 'ai'">
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
    <g v-else-if="art === 'infra'">
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
      <path d="M52 30 l8 -6 l8 6 M60 24 v14" fill="none" stroke="#0a3a32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" />
    </g>

    <!-- 備份 -->
    <g v-else-if="art === 'backup'">
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
