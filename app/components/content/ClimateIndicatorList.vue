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

const groups = climateIndicators as IndicatorGroup[]
</script>

<template>
  <div class="ind-list">
    <div
      v-for="group in groups"
      :key="group.面向"
      class="ind-block"
    >
      <div class="ind-head">
        {{ group.面向 }}<span>{{ group.指標.length }} 項指標</span>
      </div>
      <div
        v-for="item in group.指標"
        :key="item.編號"
        class="ind"
      >
        <span class="ind-n">{{ item.編號 }}</span>
        <div>
          <div class="ind-def">{{ item.標題 }}</div>
          <div class="ind-note">{{ item.說明 }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 設計稿 (改設計0828) — 十項績效指標列表 */
.ind-block {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-bg-border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;
}

.ind-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 22px;
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-bg-border);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-green-spring);
}

.ind-head span {
  font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.ind {
  display: flex;
  gap: 14px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--color-bg-border);
}

.ind:last-child {
  border-bottom: none;
}

.ind-n {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  border-radius: 4px;
  background: var(--color-green-700);
  color: var(--color-green-mint);
  font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
  font-size: 12px;
}

.ind-def {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.65;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.ind-note {
  font-size: 13px;
  line-height: 1.85;
  color: var(--color-text-secondary);
}
</style>
