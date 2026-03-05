<template>
  <div class="bbcode-content"  v-richText="{htmlText:parsedContent, styleText: styleText}" ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})
const styleText = `
fieldset{
  border: 2px groove rgb(239, 239, 239);
  max-width: 80%;
}

img {
 max-width: 60%;
 boder: none;
 margin-top: -5px;
}
`
const parsedContent = computed(() => {
  return props.content
    // 处理换行
    .replace(/\r?\n/g, '<br>')
    // 处理quote标签
    .replace(/\[quote\](.*?)\[\/quote\]/g, '<fieldset class="fieldset"><legend> 引用 </legend>$1</fieldset><br/>')
    // 处理图片标签
    .replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1">')
    // 处理颜色标签
    .replace(/\[color=([\w#]+)\](.*?)\[\/color\]/g, '<span style="color: $1">$2</span>')
    // 处理字体类型
    .replace(/\[font=([^\]]+)\](.*?)\[\/font\]/g, '<font face="$1">$2</font>')
    // 处理字体大小
    .replace(/\[size=(\d+)\](.*?)\[\/size\]/g, '<font size="$1">$2</font>')
    // 处理加粗
    .replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')
    // 处理斜体
    .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>')
})
</script>

<style scoped>
.bbcode-content {
 font-size: 12px;
 color: #000;
 
}

</style>