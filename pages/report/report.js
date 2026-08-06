const {
  getUser,
  getMonthKey,
  getItemsForMonth,
  getMonthlyHighlight,
  saveMonthlyHighlight
} = require('../../services/user-service')
const { getMonthlyTracking } = require('../../services/tracking-service')

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const THEME_OPTIONS = [
  { id: 'olive', name: '橄榄褐', color: '#75694d' },
  { id: 'amber', name: '琥珀金', color: '#a66c26' },
  { id: 'ocean', name: '雾霭蓝', color: '#557b88' },
  { id: 'rose', name: '陶土粉', color: '#9b6d60' },
  { id: 'ink', name: '墨夜黑', color: '#313337' }
]
const FONT_OPTIONS = [
  { id: 'museum', name: '博物馆宋体', sample: '人生值得收藏' },
  { id: 'classic', name: '典雅明体', sample: 'Life is a museum' },
  { id: 'handwriting', name: '书写意境', sample: '这个月的故事' }
]
const LAYOUT_OPTIONS = [
  { id: 'calendar', name: '月历海报', note: '照片月历 · 主色色块' },
  { id: 'postcard', name: '月份邮票', note: '照片邮票 · 侧边数据' }
]
const PANEL_FALLBACKS = {
  olive: '#655f4c',
  amber: '#7d552c',
  ocean: '#496671',
  rose: '#74534d',
  ink: '#35383a'
}
const DEFAULT_BACKGROUND = '/assets/art/home-hero.jpg'

const formatMonth = (monthKey) => monthKey.replace('-', '.')
const getMonthName = (monthKey) => `${Number(monthKey.slice(5))} 月`

const countStoryCharacters = (items) => items.reduce((total, item) => {
  const story = String(item.story || '').replace(/\s/g, '')
  return total + Array.from(story).length
}, 0)

const getFavoriteHall = (items) => {
  if (!items.length) return '暂无'

  const hallCounts = items.reduce((counts, item) => {
    const hall = String(item.hall || '主馆').trim() || '主馆'
    counts[hall] = (counts[hall] || 0) + 1
    return counts
  }, {})

  return Object.keys(hallCounts).sort((a, b) => hallCounts[b] - hallCounts[a])[0]
}

const formatExitTime = (timestamp) => {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getAudioMinutes = (items) => {
  const durationMs = items.reduce((total, item) => total + Math.max(0, Number(item.audioDurationMs) || 0), 0)
  return durationMs ? Math.max(1, Math.round(durationMs / 60000)) : 0
}

const getItemDateKey = (item) => {
  if (typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) return item.date
  const createdAt = new Date(item.createdAt)
  if (Number.isNaN(createdAt.getTime())) return ''
  const month = String(createdAt.getMonth() + 1).padStart(2, '0')
  const day = String(createdAt.getDate()).padStart(2, '0')
  return `${createdAt.getFullYear()}-${month}-${day}`
}

const buildCalendar = (monthKey, items) => {
  const [year, month] = monthKey.split('-').map(Number)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const recordedDays = new Set(items.map(getItemDateKey).filter(Boolean))
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const days = []

  for (let index = 0; index < firstWeekday; index += 1) {
    days.push({ key: `blank-${index}`, empty: true })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`
    days.push({
      key: dayKey,
      day,
      empty: false,
      recorded: recordedDays.has(dayKey),
      today: dayKey === todayKey
    })
  }

  return days
}

const getPhotoOptions = (items) => {
  const seen = new Set()
  return items.reduce((photos, item) => {
    const image = String(item.image || '')
    if (!image || seen.has(image)) return photos
    seen.add(image)
    photos.push({
      image,
      title: item.title || '未命名展品',
      date: item.date || ''
    })
    return photos
  }, [])
}

const normalizeChoice = (value, options, fallback) => (
  options.some((option) => option.id === value) ? value : fallback
)

const getFallbackPanelColor = (theme) => PANEL_FALLBACKS[theme] || PANEL_FALLBACKS.olive

const extractPanelColor = (imagePath, fallbackColor) => new Promise((resolve) => {
  if (!imagePath || typeof wx.createOffscreenCanvas !== 'function') {
    resolve({ color: fallbackColor, tone: 'dark' })
    return
  }

  try {
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: 24, height: 24 })
    const context = canvas.getContext('2d')
    const image = canvas.createImage()
    image.onload = () => {
      try {
        context.clearRect(0, 0, 24, 24)
        context.drawImage(image, 0, 0, 24, 24)
        const pixels = context.getImageData(0, 0, 24, 24).data
        let red = 0
        let green = 0
        let blue = 0
        let count = 0

        for (let index = 0; index < pixels.length; index += 16) {
          if (pixels[index + 3] < 128) continue
          red += pixels[index]
          green += pixels[index + 1]
          blue += pixels[index + 2]
          count += 1
        }

        if (!count) {
          resolve({ color: fallbackColor, tone: 'dark' })
          return
        }

        const averageRed = red / count
        const averageGreen = green / count
        const averageBlue = blue / count
        const luminance = averageRed * .299 + averageGreen * .587 + averageBlue * .114
        const shade = luminance > 155 ? .62 : .78
        const floor = luminance > 155 ? 20 : 12
        const panelRed = Math.round(averageRed * shade + floor)
        const panelGreen = Math.round(averageGreen * shade + floor)
        const panelBlue = Math.round(averageBlue * shade + floor)
        const panelLuminance = panelRed * .299 + panelGreen * .587 + panelBlue * .114
        resolve({
          color: `rgb(${panelRed}, ${panelGreen}, ${panelBlue})`,
          tone: panelLuminance > 150 ? 'light' : 'dark'
        })
      } catch (error) {
        resolve({ color: fallbackColor, tone: 'dark' })
      }
    }
    image.onerror = () => resolve({ color: fallbackColor, tone: 'dark' })
    image.src = imagePath
  } catch (error) {
    resolve({ color: fallbackColor, tone: 'dark' })
  }
})

Page({
  data: {
    monthKey: '',
    requestedMonthKey: '',
    monthText: '',
    monthName: '',
    monthEnglish: '',
    reportYear: '',
    weekdays: WEEKDAYS,
    calendarDays: [],
    monthlyItemCount: 0,
    monthlyWordCount: 0,
    monthlyImageCount: 0,
    monthlyVisitDays: 0,
    monthlyActiveMinutes: 0,
    monthlyAudioMinutes: 0,
    favoriteHall: '暂无',
    latestExitTime: '--:--',
    backgroundImage: DEFAULT_BACKGROUND,
    photoOptions: [],
    overlayTheme: 'olive',
    fontTheme: 'museum',
    themeOptions: THEME_OPTIONS,
    fontOptions: FONT_OPTIONS,
    layoutOptions: LAYOUT_OPTIONS,
    layoutTheme: 'calendar',
    dataPanelColor: PANEL_FALLBACKS.olive,
    dataPanelTone: 'dark',
    designerVisible: false,
    designerTab: 'layout',
    savingDesign: false
  },

  async onLoad(options = {}) {
    this.tutorialCompletionPending = options.tutorialComplete === '1'
    const requestedMonthKey = /^\d{4}-(0[1-9]|1[0-2])$/.test(options.month || '')
      ? options.month
      : getMonthKey()
    this.setData({ requestedMonthKey })
    await this.loadReport()
    if (this.tutorialCompletionPending) {
      this.tutorialCompletionTimer = setTimeout(() => this.finishTutorialPreview(), 5000)
    }
  },

  onUnload() {
    if (this.tutorialCompletionTimer) clearTimeout(this.tutorialCompletionTimer)
  },

  async onShow() {
    if (this.data.monthKey) await this.loadReport()
  },

  async loadReport() {
    const monthKey = this.data.requestedMonthKey || getMonthKey()
    const [user, tracking] = await Promise.all([
      getUser(),
      getMonthlyTracking(monthKey)
    ])

    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const monthItems = getItemsForMonth(user, monthKey)
    const photoOptions = getPhotoOptions(user.items || [])
    const design = getMonthlyHighlight(user, monthKey) || {}
    const availableImages = new Set(photoOptions.map((photo) => photo.image))
    const preferredBackground = availableImages.has(design.backgroundImage)
      ? design.backgroundImage
      : (monthItems.find((item) => item.image)?.image || photoOptions[0]?.image || DEFAULT_BACKGROUND)
    const activeMs = Math.max(0, Number(tracking.activeMs) || 0)
    const monthIndex = Number(monthKey.slice(5)) - 1

    this.setData({
      monthKey,
      monthText: formatMonth(monthKey),
      monthName: getMonthName(monthKey),
      monthEnglish: MONTH_NAMES[monthIndex],
      reportYear: monthKey.slice(0, 4),
      calendarDays: buildCalendar(monthKey, monthItems),
      monthlyItemCount: monthItems.length,
      monthlyWordCount: countStoryCharacters(monthItems),
      monthlyImageCount: monthItems.filter((item) => Boolean(item.image)).length,
      monthlyVisitDays: tracking.visitDays,
      monthlyActiveMinutes: activeMs ? Math.max(1, Math.round(activeMs / 60000)) : 0,
      monthlyAudioMinutes: getAudioMinutes(monthItems),
      favoriteHall: getFavoriteHall(monthItems),
      latestExitTime: formatExitTime(tracking.lastExitAt),
      photoOptions,
      backgroundImage: preferredBackground,
      overlayTheme: normalizeChoice(design.overlayTheme, THEME_OPTIONS, 'olive'),
      fontTheme: normalizeChoice(design.fontTheme, FONT_OPTIONS, 'museum'),
      layoutTheme: normalizeChoice(design.layoutTheme, LAYOUT_OPTIONS, 'calendar'),
      dataPanelColor: getFallbackPanelColor(normalizeChoice(design.overlayTheme, THEME_OPTIONS, 'olive')),
      dataPanelTone: 'dark'
    })
    this.updatePanelPalette(preferredBackground, normalizeChoice(design.overlayTheme, THEME_OPTIONS, 'olive'))
  },

  goBack() {
    if (this.tutorialCompletionPending) {
      this.finishTutorialPreview()
      return
    }
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/summary/summary' })
    })
  },

  openPhotoPicker() {
    if (!this.data.photoOptions.length) {
      wx.showToast({ title: '先收藏一张照片，再来装饰月报', icon: 'none' })
      return
    }
    this.setData({ designerVisible: true, designerTab: 'photo' })
  },

  openDesigner() {
    this.setData({ designerVisible: true })
  },

  closeDesigner() {
    if (this.data.savingDesign) return
    this.setData({ designerVisible: false })
  },

  stopPropagation() {},

  selectDesignerTab(event) {
    this.setData({ designerTab: event.currentTarget.dataset.tab })
  },

  selectBackground(event) {
    const image = event.currentTarget.dataset.image
    if (!image || image === this.data.backgroundImage) return
    this.updatePanelPalette(image)
    this.applyDesign({ backgroundImage: image })
  },

  selectOverlayTheme(event) {
    const overlayTheme = event.currentTarget.dataset.theme
    if (!overlayTheme || overlayTheme === this.data.overlayTheme) return
    this.applyDesign({ overlayTheme })
  },

  selectFontTheme(event) {
    const fontTheme = event.currentTarget.dataset.font
    if (!fontTheme || fontTheme === this.data.fontTheme) return
    this.applyDesign({ fontTheme })
  },

  selectLayoutTheme(event) {
    const layoutTheme = event.currentTarget.dataset.layout
    if (!layoutTheme || layoutTheme === this.data.layoutTheme) return
    this.applyDesign({ layoutTheme })
  },

  async updatePanelPalette(imagePath, overlayTheme = this.data.overlayTheme) {
    const requestId = (this.paletteRequestId || 0) + 1
    this.paletteRequestId = requestId
    const palette = await extractPanelColor(imagePath, getFallbackPanelColor(overlayTheme))
    if (requestId !== this.paletteRequestId) return
    this.setData({ dataPanelColor: palette.color, dataPanelTone: palette.tone })
  },

  async applyDesign(changes) {
    const previous = {
      backgroundImage: this.data.backgroundImage,
      overlayTheme: this.data.overlayTheme,
      fontTheme: this.data.fontTheme,
      layoutTheme: this.data.layoutTheme
    }
    this.setData({ ...changes, savingDesign: true })

    try {
      const user = await getUser()
      const existing = getMonthlyHighlight(user, this.data.monthKey) || {}
      await saveMonthlyHighlight(this.data.monthKey, {
        ...existing,
        backgroundImage: changes.backgroundImage || this.data.backgroundImage,
        overlayTheme: changes.overlayTheme || this.data.overlayTheme,
        fontTheme: changes.fontTheme || this.data.fontTheme,
        layoutTheme: changes.layoutTheme || this.data.layoutTheme
      })
      this.setData({ savingDesign: false })
    } catch (error) {
      this.setData({ ...previous, savingDesign: false })
      wx.showToast({ title: '样式保存失败，请重试', icon: 'none' })
    }
  },

  finishTutorialPreview() {
    if (!this.tutorialCompletionPending) return
    this.tutorialCompletionPending = false
    if (this.tutorialCompletionTimer) {
      clearTimeout(this.tutorialCompletionTimer)
      this.tutorialCompletionTimer = null
    }
    wx.reLaunch({ url: '/pages/index/index?tutorialComplete=1' })
  },

  handleTutorialPreviewTap() {
    this.finishTutorialPreview()
  },

  onShareAppMessage() {
    return {
      title: `我的 ${this.data.monthName || ''}人生博物馆月报`,
      path: `/pages/report/report?month=${this.data.monthKey || getMonthKey()}`
    }
  }
})
