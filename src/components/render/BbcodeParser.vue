<template>
  <div class="bbcode-content" v-html="parsedContent"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const parsedContent = computed(() => {
  let result = props.content

  // 先处理 [img] 标签，避免 URL 被错误替换
  // 使用占位符临时替换 [img] 内容
  const imgPlaceholders: string[] = []
  result = result.replace(/\[img\](.*?)\[\/img\]/g, (match, url) => {
    const placeholder = `__IMG_PLACEHOLDER_${imgPlaceholders.length}__`
    imgPlaceholders.push(url)
    return placeholder
  })

  // 处理 [url] 标签
  result = result.replace(/\[url\]([^\]]+?)\[\/url\]/g, '<a href="$1" target="_blank">$1</a>')
  result = result.replace(/\[url=([^\]]+)\]([^\]]+?)\[\/url\]/g, '<a href="$1" target="_blank">$2</a>')

  // 处理纯文本链接（URL）- 排除已经被包裹在标签中的URL
  // 使用负向回顾后发，避免替换已经在 HTML 标签中的 URL
  result = result.replace(/(?<!["'=])(https?:\/\/[^\s\n\r<]+)/g, '<a href="$1" target="_blank">$1</a>')

  // 处理换行
  result = result.replace(/\r?\n/g, '<br>')

  // 处理quote标签
  result = result.replace(
    /\[quote\](.*?)\[\/quote\]/g,
    '<fieldset class="fieldset"><legend> 引用 </legend>$1</fieldset><br/>',
  )

  // 恢复 [img] 标签
  result = result.replace(/__IMG_PLACEHOLDER_(\d+)__/g, (match, index) => {
    const url = imgPlaceholders[parseInt(index)]
    return `<img src="${url}">`
  })

  // 处理颜色标签
  result = result.replace(/\[color=([\w#]+)\](.*?)\[\/color\]/g, '<span style="color: $1">$2</span>')

  // 处理字体类型
  result = result.replace(/\[font=([^\]]+)\](.*?)\[\/font\]/g, '<font face="$1">$2</font>')

  // 处理字体大小
  result = result.replace(/\[size=(\d+)\](.*?)\[\/size\]/g, '<font size="$1">$2</font>')

  // 处理加粗
  result = result.replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')

  // 处理斜体
  result = result.replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>')

  // 处理下划线
  result = result.replace(/\[u\](.*?)\[\/u\]/g, '<u>$1</u>')

  // 处理删除线
  result = result.replace(/\[s\](.*?)\[\/s\]/g, '<s>$1</s>')

  // 处理代码标签
  result = result.replace(/\[code\](.*?)\[\/code\]/g, '<code>$1</code>')

  return result
})
</script>

<style scoped>
.bbcode-content {
  color: #000;
  font-size: 12px;
  line-height: 1.6;
}

.bbcode-content :deep(fieldset) {
  padding: 10px;
  border: 2px groove rgb(239, 239, 239);
  margin-block: 10px;
  margin-inline: 0;
  max-inline-size: 80%;
}

.bbcode-content :deep(img) {
  display: block;
  border: none;
  margin-block: 10px;
  margin-block-start: -5px;
  margin-inline: 0;
  max-inline-size: 60%;
}

.bbcode-content :deep(a) {
  color: #1976d2;
  text-decoration: none;
  word-break: break-all;
}

.bbcode-content :deep(a:hover) {
  text-decoration: underline;
}

.bbcode-content :deep(br) {
  display: block;
  content: '';
  margin-block-end: 0.3em;
}
</style>
