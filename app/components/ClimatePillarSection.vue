<script setup lang="ts">
import climateIndicators from '~/assets/data/climate-indicators.json'

interface Indicator {
  編號: number
  標題: string
  說明: string
}

interface IndicatorGroup {
  面向: string
  簡稱: string
  指標: Indicator[]
}

// 單一資料來源：與 /methodology 的指標列表共用 climate-indicators.json
const groups = climateIndicators as IndicatorGroup[]
</script>

<template>
  <section class="page-section">
    <div class="section-head">
      <h2>氣候績效指標方法論</h2>
    </div>
    <p class="section-desc">
      綠盟參考台灣氣候法規及國際標準，制定涵蓋承諾、行動與透明度三大面向，共十項指標的氣候績效檢核表，檢驗企業氣候表現。
    </p>

    <div class="pillar-grid">
      <div
        v-for="group in groups"
        :key="group.面向"
        class="pillar"
      >
        <div class="pillar-head">
          <span class="pillar-title">{{ group.簡稱 }}</span>
          <span class="pillar-count">{{ group.指標.length }} 項指標</span>
        </div>
        <div
          v-for="item in group.指標"
          :key="item.編號"
          class="pillar-item"
        >
          <span class="pillar-num">{{ item.編號 }}</span>
          <span class="pillar-text">{{ item.標題 }}</span>
        </div>
      </div>
    </div>

    <UButton
      to="/methodology"
      variant="outline"
      trailing-icon="i-heroicons-arrow-right-20-solid"
      class="btn-section"
    >
      查看方法論定義
    </UButton>
  </section>
</template>

<style scoped>
.page-section {
  padding: 56px 64px;
  border-top: 1px solid var(--color-bg-border);
}

.section-head {
  margin-bottom: 22px;
}

.section-head h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.015em;
}

.section-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  max-width: 600px;
  margin-bottom: 22px;
}

/* ── 三大面向 pillar（設計稿 改設計0828）─────────────── */
.pillar-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
  margin-bottom: 24px;
}

.pillar {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-bg-border);
  border-radius: 12px;
  padding: 22px 24px 20px;
}

.pillar-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-bg-border);
  margin-bottom: 6px;
}

.pillar-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-green-spring);
  letter-spacing: 0.02em;
}

.pillar-count {
  font-size: 13px;
  font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
  color: var(--color-text-muted);
}

.pillar-item {
  display: flex;
  gap: 11px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-bg-border);
}

.pillar-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.pillar-num {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  border-radius: 4px;
  background: var(--color-green-700);
  color: var(--color-green-mint);
  font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
  font-size: 11px;
  font-weight: 500;
}

.pillar-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.page-section :deep(.btn-section) {
  color: var(--color-green-spring);
  border-color: var(--color-green-forest);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 22px;
  border-radius: 8px;
  transition: background 0.15s, border-color 0.15s;
}

.page-section :deep(.btn-section:hover) {
  background: var(--color-bg-elevated);
  border-color: var(--color-green-pure);
}

@media (max-width: 1100px) {
  .pillar-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .page-section {
    padding: 40px 24px;
  }
}
</style>
