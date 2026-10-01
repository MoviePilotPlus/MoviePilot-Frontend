import io
path = '__tests__/AccountSettingCollect.spec.ts'
p = io.open(path, encoding='utf-8').read()

# 1) openAccordion 辅助函数已无整体手风琴，改为展开行内面板的辅助
old = """/** 展开图床/简介线路卡的手风琴面板（Vuetify 折叠面板内容默认收起）。 */
async function openAccordion(cardTitle: string) {
  const card = getCardByTitle(cardTitle)
  const header = card.element.querySelector('.v-expansion-panel-title') as HTMLElement
  await fireEvent.click(header)
  return card
}"""
new = """/** 取设置卡并展开其内全部行内折叠面板（图床凭据/refactor 参数，内容默认收起）。 */
async function openCardPanels(cardTitle: string) {
  const card = getCardByTitle(cardTitle)
  for (const header of Array.from(card.element.querySelectorAll('.v-expansion-panel-title'))) {
    await fireEvent.click(header as HTMLElement)
  }
  return card
}"""
assert old in p, 'helper'
p = p.replace(old, new, 1)
p = p.replace("await openAccordion('图床设置')", "await openCardPanels('图床设置')")
p = p.replace("await openAccordion('简介抓取线路')", "await openCardPanels('简介抓取线路')")

# 2) 基础设置保存断言：恢复整组提交（含截图参数键，模板 JSON 为回写值）
old = """      expect(payload.MEDIA_DIR).toBe('/media')
      expect(payload.YOUKU_DOWNLOAD_LINE).toBeUndefined()
      // 截图组键已并入截图卡保存，基础设置不再提交
      expect(payload.SCREENSHOT_QUALITY_CHECK).toBeUndefined()
      expect(payload.SCREENSHOT_TEMPLATE_CONFIG).toBeUndefined()
    })
  })"""
new = """      expect(payload.MEDIA_DIR).toBe('/media')
      expect(payload.YOUKU_DOWNLOAD_LINE).toBeUndefined()
      // 截图参数键随基础设置整组提交；模板 JSON 为空串（无模板卡保存时保持原值）
      expect(payload.SCREENSHOT_QUALITY_CHECK).toBe(true)
    })
  })"""
assert old in p, 'basic payload'
p = p.replace(old, new, 1)

# 3) 截图卡保存断言：只提交模板 JSON，不带参数键
old = """  it('截图参数随截图卡整卡提交（模板 JSON + 质量校验开关）', async () => {
    await renderCollectSettings()

    const screenshotCard = getCardByTitle('截图拼接模板')
    expect(screenshotCard.getByText('截图质量校验')).toBeTruthy()
    await fireEvent.click(screenshotCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/env')
      expect(call).toBeTruthy()
      const payload = call?.[1] as Record<string, unknown>
      expect(payload.SCREENSHOT_QUALITY_CHECK).toBe(true)
      expect(typeof payload.SCREENSHOT_TEMPLATE_CONFIG).toBe('string')
      expect(payload.MEDIA_DIR).toBeUndefined()
    })
  })"""
new = """  it('截图卡保存只提交模板 JSON（参数键归基础设置卡）', async () => {
    await renderCollectSettings()

    const screenshotCard = getCardByTitle('截图拼接模板')
    await fireEvent.click(screenshotCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/env')
      expect(call).toBeTruthy()
      const payload = call?.[1] as Record<string, unknown>
      expect(typeof payload.SCREENSHOT_TEMPLATE_CONFIG).toBe('string')
      expect(Object.keys(payload)).toEqual(['SCREENSHOT_TEMPLATE_CONFIG'])
    })
  })

  it('截图参数随基础设置卡以 MB 展示、字节提交（失焦清空修复：空输入不清值）', async () => {
    await renderCollectSettings()

    const basicCard = getCardByTitle('基础设置')
    const mbInputs = Array.from(basicCard.element.querySelectorAll('input[type="number"]'))
      .filter(el => (el.closest('.v-input')?.textContent ?? '').includes('MB'))
    expect(mbInputs.length).toBe(2)
    // 默认 5242880 字节 → 显示 5MB
    expect((mbInputs[0] as HTMLInputElement).value).toBe('5')
    // 改成 4MB → 保存载荷回字节
    await fireEvent.update(mbInputs[0], '4')
    // 失焦/清空输入（空串）不把源值写崩
    await fireEvent.update(mbInputs[0], '')
    expect((mbInputs[0] as HTMLInputElement).value).toBe('4')
    await fireEvent.click(basicCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/env')
      expect(call).toBeTruthy()
      const payload = call?.[1] as Record<string, unknown>
      expect(payload.SCREENSHOT_COMPRESS_LIMIT).toBe(4 * 1024 * 1024)
    })
  })"""
assert old in p, 'screenshot save case'
p = p.replace(old, new, 1)

# 4) 旧的「截图预览懒加载」用例之后插入的 MB 用例已由上面覆盖，删除旧 MB 用例
old = """  it('截图体积上下限以 MB 显示并按字节提交', async () => {
    await renderCollectSettings()

    const screenshotCard = getCardByTitle('截图拼接模板')
    const mbInputs = Array.from(screenshotCard.element.querySelectorAll('input[type="number"]'))
      .filter(el => (el.closest('.v-input')?.textContent ?? '').includes('MB'))
    expect(mbInputs.length).toBe(2)
    // 默认 5242880 字节 → 显示 5MB
    expect((mbInputs[0] as HTMLInputElement).value).toBe('5')
    // 改成 4MB → 保存载荷回字节
    await fireEvent.update(mbInputs[0], '4')
    await fireEvent.click(screenshotCard.getByRole('button', { name: /保存/ }))
    await waitFor(() => {
      const call = mocks.apiPost.mock.calls.find(([path]) => path === 'system/env')
      expect(call).toBeTruthy()
      const payload = call?.[1] as Record<string, unknown>
      expect(payload.SCREENSHOT_COMPRESS_LIMIT).toBe(4 * 1024 * 1024)
    })
  })"""
assert old in p, 'old mb case'
p = p.replace(old, '', 1)

# 5) 恢复默认用例仍在命名卡，无须改；图床渲染用例的「凭据段进浅底子面板」选择器仍有效
io.open(path, 'w', encoding='utf-8', newline='').write(p)
print('ok')
